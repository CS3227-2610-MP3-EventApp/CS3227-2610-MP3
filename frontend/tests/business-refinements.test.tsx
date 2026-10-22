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

test("same-route focus revalidation conceals content and restores scroll position", async()=>{
  applications.install(); await renderPrototype("/business");
  const previousY=Object.getOwnPropertyDescriptor(window,"scrollY");
  const previousHeight=Object.getOwnPropertyDescriptor(document.documentElement,"scrollHeight");
  Object.defineProperty(window,"scrollY",{configurable:true,value:450});
  Object.defineProperty(document.documentElement,"scrollHeight",{configurable:true,value:1400});
  const scroll=vi.spyOn(window,"scrollTo").mockImplementation(()=>{});
  try {
    const release=applications.hold("/api/v1/auth/me");
    await act(async()=>{window.dispatchEvent(new Event("focus"));});
    expect(screen.queryByRole("heading",{level:1})).not.toBeInTheDocument();
    await act(async()=>release());
    await waitFor(()=>expect(scroll).toHaveBeenCalledWith(0,450));
    expect(await screen.findByRole("heading",{level:1})).toBeVisible();
  } finally {
    if(previousY) Object.defineProperty(window,"scrollY",previousY);
    if(previousHeight) Object.defineProperty(document.documentElement,"scrollHeight",previousHeight);
    else delete (document.documentElement as unknown as Record<string,unknown>).scrollHeight;
  }
});
