import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { renderPrototype } from "./helpers/renderPrototype";
import { applications, B1, E1 } from "./fixtures/applications";

const route = `/business/applications?businessId=${B1}&eventId=${E1}`;
test("event dates use event-local human-readable date and24-hour time", async () => {
  applications.install(); await renderPrototype(route);
  expect(await screen.findByText(/01 Jan 2027.*09:00.*17:00/)).toBeVisible();
  expect(screen.queryByText(/2027-01-01T01:00:00Z/)).not.toBeInTheDocument();
});
test("new application prepopulates editable owner contact details", async () => {
  applications.install(); const fallback = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "object" && "url" in input ? input.url : String(input);
    if (new URL(url, location.origin).pathname === "/api/v1/auth/contact-profile") return new Response(JSON.stringify({displayName:"Avery Tan",email:"avery@example.test"}),{headers:{"Content-Type":"application/json"}});
    return fallback(input,init);
  }));
  await renderPrototype(route);
  await waitFor(() => expect(screen.getByLabelText(/^contact name$/i)).toHaveValue("Avery Tan"));
  expect(screen.getByLabelText(/^contact email$/i)).toHaveValue("avery@example.test");
  expect(screen.getByLabelText(/^contact email$/i)).not.toHaveAttribute("readonly");
});

// MERGE-TCR-02: superseded by master's approved SILENT-TCR-01 — a same-route focus check is silent, so the page
// stays mounted (no concealment, no scroll jump) while the session is re-confirmed.
test("same-route focus revalidation keeps content visible without moving the scroll position", async()=>{
  applications.install(); await renderPrototype("/business");
  const scroll=vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  const heading=await screen.findByRole("heading",{level:1});
  const release=applications.hold("/api/v1/auth/me");
  await act(async()=>{window.dispatchEvent(new Event("focus"));});
  expect(heading).toBeVisible();
  await act(async()=>release());
  expect(await screen.findByRole("heading",{level:1})).toBe(heading);
  expect(scroll).not.toHaveBeenCalled();
});
