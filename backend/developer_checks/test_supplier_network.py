"""Developer checks for the concrete default transport, outside acceptance baseline."""
import socket
import ssl
from app.supplier_research import safe_page


def test_default_connection_uses_numeric_peer_and_original_verified_tls(monkeypatch):
    calls = []
    class Raw:
        def settimeout(self, value):
            assert 0 < value <= 2
        def close(self):
            calls.append("closed")
    raw = Raw()
    context = ssl.create_default_context()
    assert context.check_hostname and context.verify_mode == ssl.CERT_REQUIRED
    class Context:
        def wrap_socket(self, sock, *, server_hostname, do_handshake_on_connect):
            assert sock is raw
            assert not do_handshake_on_connect
            calls.append(("tls", server_hostname))
            return TLS()
    class TLS:
        def settimeout(self, value):
            assert 0 < value <= 2
        def do_handshake(self):
            calls.append("handshake")
    def connect(address, *, timeout):
        calls.append(("connect", address, timeout))
        return raw
    monkeypatch.setattr(safe_page.socket, "create_connection", connect)
    connection = safe_page._PinnedConnection("supplier.example", "93.184.216.34", 2)
    # The constructor's actual context enforces certificates before injection.
    assert connection._context.check_hostname
    assert connection._context.verify_mode == ssl.CERT_REQUIRED
    connection._context = Context()
    connection.connect()
    assert isinstance(connection.sock, TLS)
    assert calls[0][:2] == ("connect", ("93.184.216.34", 443))
    assert 0 < calls[0][2] <= 2
    assert calls[1:] == [("tls", "supplier.example"), "handshake"]


def test_tls_failure_closes_raw_connection(monkeypatch):
    closed = []
    class Raw:
        def settimeout(self, value):
            pass
        def close(self):
            closed.append(True)
    class Context:
        def wrap_socket(self, *args, **kwargs):
            raise ssl.SSLCertVerificationError("synthetic mismatch")
    monkeypatch.setattr(safe_page.socket, "create_connection", lambda *args, **kwargs: Raw())
    connection = safe_page._PinnedConnection("supplier.example", "93.184.216.34", 2)
    connection._context = Context()
    try:
        connection.connect()
    except ssl.SSLCertVerificationError:
        pass
    else:
        raise AssertionError("certificate errors must propagate")
    assert closed


def test_default_transport_timeout_shuts_down_and_closes_socket(monkeypatch):
    seen = []
    class Sock:
        def shutdown(self, how):
            seen.append(("shutdown", how))
    class Connection:
        sock = Sock()
        def __init__(self, host, peer, timeout):
            seen.append((host, peer, timeout))
        def request(self, method, path, headers):
            seen.append((method, path, headers))
        def getresponse(self):
            timer[0]()
            raise TimeoutError()
        def close(self):
            seen.append("close")
        def abort(self):
            self.sock.shutdown(socket.SHUT_RDWR)
            self.close()
    timer = []
    class Timer:
        def __init__(self, timeout, callback):
            timer.append(callback)
        def start(self):
            pass
        def cancel(self):
            pass
    monkeypatch.setattr(safe_page, "_PinnedConnection", Connection)
    monkeypatch.setattr(safe_page.threading, "Timer", Timer)
    try:
        safe_page._Transport().request("https://supplier.example/items?q=pack", peer_ip="93.184.216.34", tls_hostname="supplier.example", headers={"Accept-Encoding":"identity"}, timeout=1)
    except TimeoutError:
        pass
    assert ("shutdown", socket.SHUT_RDWR) in seen
    assert seen.count("close") == 2
    assert ("GET", "/items?q=pack", {"Accept-Encoding":"identity"}) in seen


def test_expiry_during_connect_prevents_tls_and_closes_attached_socket(monkeypatch):
    closed = []
    class Raw:
        def close(self):
            closed.append(True)
    connection = safe_page._PinnedConnection("supplier.example", "93.184.216.34", 1)
    def connect(*args, **kwargs):
        connection.abort()  # Watchdog fires before socket attachment.
        return Raw()
    monkeypatch.setattr(safe_page.socket, "create_connection", connect)
    try:
        connection.connect()
    except TimeoutError:
        pass
    else:
        raise AssertionError("expired connection must not proceed to TLS")
    assert closed and connection.sock is None


def test_watchdog_interrupts_attached_tls_handshake(monkeypatch):
    calls = []
    class Sock:
        def settimeout(self, value):
            pass
        def shutdown(self, value):
            calls.append("shutdown")
        def close(self):
            calls.append("close")
        def do_handshake(self):
            connection.abort()
    class Context:
        def wrap_socket(self, *args, **kwargs):
            return Sock()
    connection = safe_page._PinnedConnection("supplier.example", "93.184.216.34", 1)
    connection._context = Context()
    monkeypatch.setattr(safe_page.socket, "create_connection", lambda *args, **kwargs: Sock())
    try:
        connection.connect()
    except TimeoutError:
        pass
    else:
        raise AssertionError("interrupted handshake must fail")
    assert "shutdown" in calls and "close" in calls


def test_redirects_share_one_ten_second_candidate_deadline(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr(safe_page.time, "monotonic", lambda: clock[0])
    calls = []
    def resolver(host, port, **kwargs):
        clock[0] += 4
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]
    class Response:
        status_code = 302
        headers = {"location":"https://next.example/item"}
        def close(self):
            pass
    class Transport:
        def request(self, *args, **kwargs):
            calls.append(kwargs)
            clock[0] += 3
            return Response()
    try:
        safe_page.SafePageRetriever(resolver, Transport()).fetch("https://supplier.example/item", safe_page.RequestBudget())
    except safe_page.PageFailure as exc:
        assert exc.code == "timed_out"
    else:
        raise AssertionError("redirect must not reset ten-second deadline")
    assert len(calls) == 1 and calls[0]["timeout"] <= 6
