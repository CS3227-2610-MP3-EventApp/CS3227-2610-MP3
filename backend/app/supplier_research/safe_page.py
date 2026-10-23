"""Public HTTPS retrieval with checked numeric peers and original-host TLS.

No ambient proxy, cookies, credentials, previews, or page-directed requests.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
import http.client
import ipaddress
import re
import socket
import ssl
import threading
import time
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout


class PageFailure(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


@dataclass
class FetchedPage:
    url: str
    requested_url: str
    retrieved_at: datetime
    text: str
    content_type: str


class RequestBudget:
    def __init__(self, limit=5, deadline=None, before_request=None):
        self.limit, self.deadline, self.before_request = limit, deadline, before_request
        self.used = 0

    def check(self):
        if self.deadline is not None and time.monotonic() >= self.deadline:
            raise PageFailure("timed_out")

    def consume(self):
        self.check()
        if self.used >= self.limit:
            raise PageFailure("fetch_failed")
        if self.before_request:
            self.before_request()
        self.check()
        self.used += 1


def checked_url(value):
    try:
        if not isinstance(value, str) or len(value) > 4096:
            raise ValueError()
        decoded = unquote(value)
        if any(ord(c) < 33 or ord(c) == 127 for c in decoded) or "\\" in decoded:
            raise ValueError()
        parsed = urlsplit(value)
        if parsed.scheme != "https" or parsed.username is not None or parsed.password is not None or parsed.port not in (None, 443):
            raise ValueError()
        host = parsed.hostname
        if not host or parsed.fragment or host.endswith(".") or "%" in host or not host.isascii():
            raise ValueError()
        if not re.fullmatch(r"[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?", host):
            raise ValueError()
        labels = host.split(".")
        if len(labels) < 2 or any(not label or len(label) > 63 or label.startswith("-") or label.endswith("-") for label in labels):
            raise ValueError()
        # Reject alternate numeric host forms before the operating-system resolver.
        if all(re.fullmatch(r"(?:0[xX][0-9a-fA-F]+|[0-9]+)", x) for x in labels) or re.fullmatch(r"(?:0[xX][0-9a-fA-F]+|[0-9]+)", host):
            raise ValueError()
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise ValueError()
        return urlunsplit(("https", host.lower(), parsed.path or "/", parsed.query, "")), host.lower()
    except (ValueError, UnicodeError):
        raise PageFailure("unsafe_destination") from None


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.hidden = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "template"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "template"}:
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


class _PinnedConnection(http.client.HTTPSConnection):
    def __init__(self, host, peer, timeout):
        self.deadline = time.monotonic() + timeout
        self.interrupted = threading.Event()
        super().__init__(host, port=443, timeout=timeout, context=ssl.create_default_context())
        self.peer = peer

    def abort(self):
        self.interrupted.set()
        sock = self.sock
        if sock is not None:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
        self.close()

    def _remaining(self):
        remaining = self.deadline - time.monotonic()
        if self.interrupted.is_set() or remaining <= 0:
            raise TimeoutError()
        return remaining

    def connect(self):
        # Numeric address is never resolved again; TLS still authenticates the URL host.
        sock = socket.create_connection((self.peer, 443), timeout=self._remaining())
        self.sock = sock
        try:
            remaining = self._remaining()
            sock.settimeout(remaining)
            tls = self._context.wrap_socket(sock, server_hostname=self.host, do_handshake_on_connect=False)
            self.sock = tls
            tls.settimeout(self._remaining())
            tls.do_handshake()
            self._remaining()
        except BaseException:
            sock.close()
            self.close()
            raise


class _Response:
    def __init__(self, connection, response, timer):
        self.connection, self.response, self.timer = connection, response, timer
        self.status_code = response.status
        self.headers = dict(response.getheaders())

    def iter_raw(self):
        while True:
            chunk = self.response.read1(65536)
            if not chunk:
                return
            yield chunk

    def close(self):
        self.timer.cancel()
        self.response.close()
        self.connection.close()


class _Transport:
    def request(self, url, *, peer_ip, tls_hostname, headers, timeout):
        parsed = urlsplit(url)
        connection = _PinnedConnection(tls_hostname, peer_ip, timeout)
        def interrupt():
            connection.abort()
        timer = threading.Timer(timeout, interrupt)
        timer.daemon = True
        timer.start()
        try:
            connection.request("GET", (parsed.path or "/") + ("?" + parsed.query if parsed.query else ""), headers=headers)
            return _Response(connection, connection.getresponse(), timer)
        except BaseException:
            timer.cancel()
            connection.close()
            raise


# Bounded outstanding DNS work; timed-out OS resolution never triggers a connection.
_dns_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="supplier-dns")
_dns_slots = threading.BoundedSemaphore(4)


class SafePageRetriever:
    def __init__(self, resolver=None, transport=None):
        self.resolver = resolver or socket.getaddrinfo
        self.transport = transport or _Transport()

    def _resolve(self, host, timeout):
        if not _dns_slots.acquire(blocking=False):
            raise PageFailure("fetch_failed")
        def resolve():
            try:
                return self.resolver(host, 443, type=socket.SOCK_STREAM)
            finally:
                _dns_slots.release()
        future = _dns_pool.submit(resolve)
        try:
            answers = future.result(timeout=timeout)
        except FutureTimeout:
            raise PageFailure("timed_out") from None
        except (OSError, ValueError):
            raise PageFailure("fetch_failed") from None
        addresses = [answer[4][0] for answer in answers]
        if not addresses:
            raise PageFailure("unsafe_destination")
        for value in addresses:
            address = ipaddress.ip_address(value)
            mapped = isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped is not None
            if not address.is_global or address.is_multicast or address.is_reserved or mapped:
                raise PageFailure("unsafe_destination")
        return addresses[0]

    def fetch(self, url, budget):
        budget.check()
        requested, _ = checked_url(url)
        current = requested
        deadline = min(time.monotonic() + 10, budget.deadline if budget.deadline is not None else float("inf"))
        for hop in range(3):
            budget.check()
            current, host = checked_url(current)
            if time.monotonic() >= deadline:
                raise PageFailure("timed_out")
            peer = self._resolve(host, max(0.001, deadline - time.monotonic()))
            budget.consume()
            response = None
            try:
                if time.monotonic() >= deadline:
                    raise PageFailure("timed_out")
                response = self.transport.request(current, peer_ip=peer, tls_hostname=host,
                    headers={"Accept": "text/html, text/plain", "Accept-Encoding": "identity", "User-Agent": "EventApp-SupplierResearch/1.0"},
                    timeout=max(0.001, deadline - time.monotonic()))
                headers = {key.lower(): value for key, value in response.headers.items()}
                if response.status_code in {301, 302, 303, 307, 308}:
                    if hop == 2 or not headers.get("location"):
                        raise PageFailure("fetch_failed")
                    current = urljoin(current, headers["location"])
                    continue
                if response.status_code != 200:
                    raise PageFailure("fetch_failed")
                content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
                if content_type not in {"text/html", "text/plain"} or headers.get("content-encoding", "identity").lower() != "identity":
                    raise PageFailure("unsupported_content")
                if "content-length" in headers and (not headers["content-length"].isdigit() or int(headers["content-length"]) > 1048576):
                    raise PageFailure("too_large")
                body = bytearray()
                for chunk in response.iter_raw():
                    budget.check()
                    if time.monotonic() >= deadline:
                        raise PageFailure("timed_out")
                    body.extend(chunk)
                    if len(body) > 1048576:
                        raise PageFailure("too_large")
                budget.check()
                if time.monotonic() >= deadline:
                    raise PageFailure("timed_out")
                text = body.decode("utf-8", errors="replace")
                if content_type == "text/html":
                    parser = _Text()
                    parser.feed(text)
                    text = " ".join(" ".join(parser.parts).split())
                return FetchedPage(current, requested, datetime.now(timezone.utc), text, content_type)
            except PageFailure:
                raise
            except (OSError, ValueError, http.client.HTTPException):
                raise PageFailure("fetch_failed") from None
            finally:
                if response is not None:
                    response.close()
        raise PageFailure("fetch_failed")
