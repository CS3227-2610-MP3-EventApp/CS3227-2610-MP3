import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { renderPrototype, tabTo } from "../helpers/renderPrototype";
import { auth, seedActor } from "../fixtures/auth";

const colorModeKey = "eventapp.colorMode";
const sessionKey = "eventapp.prototype.session";

function preferDark(dark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: query === "(prefers-color-scheme: dark)" ? dark : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
}

function appearanceControl() {
  return screen.getByRole("button", { name: /appearance|switch.*(?:light|dark).*mode/i });
}

function expectOnlyColorPreference(value: "light" | "dark") {
  expect(window.localStorage).toHaveLength(1);
  expect(window.localStorage.key(0)).toBe(colorModeKey);
  expect(window.localStorage.getItem(colorModeKey)).toBe(value);
}

function representativePixels(value: string) {
  const numeric = Number.parseFloat(value);
  return value.trim().endsWith("rem") ? numeric * 16 : numeric;
}

function expectEffectiveMode(mode: "light" | "dark") {
  expect(document.documentElement).toHaveAttribute("data-color-mode", mode);
  const surface = getComputedStyle(document.body).backgroundColor;
  const text = getComputedStyle(document.body).color;
  expect(surface).not.toBe("rgba(0, 0, 0, 0)");
  expect(text).not.toBe(surface);
  return { surface, text };
}

function paletteSnapshot() {
  return {
    surface: getComputedStyle(document.body).backgroundColor,
    text: getComputedStyle(document.body).color,
  };
}

function expectMinimumTextSize(element: Element, minimumPixels: number) {
  expect(representativePixels(getComputedStyle(element).fontSize)).toBeGreaterThanOrEqual(minimumPixels);
}

function expectReadableAlertText(alert: HTMLElement) {
  const message = alert.querySelector(".MuiAlert-message") ?? alert;
  // jsdom omits the computed font size on this unstyled inheriting message div.
  expectMinimumTextSize(getComputedStyle(message).fontSize === "" ? alert : message, 21);
}

describe("revision 2 AC07 and AC11-AC12 appearance preference", () => {
  test.each([
    [false, /switch.*dark.*mode/i],
    [true, /switch.*light.*mode/i],
  ] as const)("follows the operating-system preference on first use (dark=%s)", async (dark, nextModeLabel) => {
    preferDark(dark);
    await renderPrototype();

    expectEffectiveMode(dark ? "dark" : "light");
    expect(appearanceControl()).toHaveAccessibleName(nextModeLabel);
    expect(window.localStorage).toHaveLength(0);
  });

  test("renders observably different OS-selected light and dark palettes across isolated mounts", async () => {
    preferDark(false);
    const lightRender = await renderPrototype();
    expectEffectiveMode("light");
    const lightPalette = paletteSnapshot();
    lightRender.unmount();

    window.localStorage.clear();
    preferDark(true);
    await renderPrototype();
    expectEffectiveMode("dark");
    expect(paletteSnapshot()).not.toEqual(lightPalette);
  });

  test("renders observably different saved light and dark palettes despite conflicting OS preferences", async () => {
    preferDark(false);
    window.localStorage.setItem(colorModeKey, "dark");
    const darkRender = await renderPrototype();
    expectEffectiveMode("dark");
    const darkPalette = paletteSnapshot();
    darkRender.unmount();

    window.localStorage.clear();
    preferDark(true);
    window.localStorage.setItem(colorModeKey, "light");
    await renderPrototype();
    expectEffectiveMode("light");
    expect(paletteSnapshot()).not.toEqual(darkPalette);
  });

  test.each([
    ["light", true, /switch.*dark.*mode/i],
    ["dark", false, /switch.*light.*mode/i],
  ] as const)("saved %s overrides the conflicting OS preference", async (saved, osDark, nextModeLabel) => {
    preferDark(osDark);
    window.localStorage.setItem(colorModeKey, saved);
    await renderPrototype();

    expectEffectiveMode(saved);
    expect(appearanceControl()).toHaveAccessibleName(nextModeLabel);
    expectOnlyColorPreference(saved);
  });

  test("removes an invalid preference and falls back to the OS without creating authority", async () => {
    preferDark(true);
    window.localStorage.setItem(colorModeKey, "system-and-admin=true");
    const exactSession = { role: "organiser", displayName: "Synthetic Organiser" };
    seedActor(exactSession.role as "organiser", exactSession.displayName);
    await renderPrototype("/organiser");

    expect(window.location.pathname).toBe("/organiser");
    expect(screen.getByText("Synthetic Organiser")).toBeVisible();
    expectEffectiveMode("dark");
    expect(appearanceControl()).toHaveAccessibleName(/switch.*light.*mode/i);
    expect(window.localStorage).toHaveLength(0);
    expect(auth.current).toMatchObject(exactSession);
  });

  test.each(["/login", "/register/attendee", "/register/business"])(
    "provides a labelled appearance control on entry screen %s",
    async (path) => {
      preferDark(false);
      await renderPrototype(path);
      expect(appearanceControl()).toBeVisible();
    },
  );

  test.each(["attendee", "organiser", "business"] as const)(
    "provides a labelled appearance control on the %s home",
    async (role) => {
      preferDark(false);
      seedActor(role, `Synthetic ${role}`);
      await renderPrototype(`/${role}`);
      expect(appearanceControl()).toBeVisible();
    },
  );

  test("applies a choice immediately and persists only its exact value", async () => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype();
    const before = {
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    };

    await user.click(appearanceControl());

    expectOnlyColorPreference("dark");
    expectEffectiveMode("dark");
    expect(appearanceControl()).toHaveAccessibleName(/switch.*light.*mode/i);
    await waitFor(() => expect({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    }).not.toEqual(before));
  });

  test("preserves an explicit choice and exact session across navigation and remount", async () => {
    preferDark(false);
    const user = userEvent.setup();
    const first = await renderPrototype();
    await user.click(appearanceControl());
    seedActor("business", "Synthetic Business");
    first.unmount();

    const home = await renderPrototype("/business");
    expect(appearanceControl()).toHaveAccessibleName(/switch.*light.*mode/i);
    expectOnlyColorPreference("dark");
    expect(auth.current).toMatchObject({
      role: "business",
      displayName: "Synthetic Business",
    });
    home.unmount();

    await renderPrototype("/login");
    expect(appearanceControl()).toHaveAccessibleName(/switch.*light.*mode/i);
    expectOnlyColorPreference("dark");
  });

  test.each(["attendee", "business"] as const)("does not discard the %s registration form when toggled", async (kind) => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype(`/register/${kind}`);
    await user.type(screen.getByLabelText(/display name/i), "Retained Person");
    await user.type(screen.getByLabelText(/^username$/i), "retained-user");
    await user.type(screen.getByLabelText(/^email$/i), "retained@example.test");
    if (kind === "business") await user.type(screen.getByLabelText(/business name/i), "Retained Studio");
    await user.type(screen.getByLabelText(/^password$/i), "Retained-123");
    await user.type(screen.getByLabelText(/confirm password/i), "Retained-123");

    await user.click(appearanceControl());

    expect(screen.getByLabelText(/display name/i)).toHaveValue("Retained Person");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("retained-user");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("retained@example.test");
    if (kind === "business") expect(screen.getByLabelText(/business name/i)).toHaveValue("Retained Studio");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("Retained-123");
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue("Retained-123");
    expectOnlyColorPreference("dark");
    expect(window.sessionStorage).toHaveLength(0);
  });

  test("exposes a keyboard-operable appearance control with a mode-specific label", async () => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype();
    const control = appearanceControl();

    await tabTo(user, control);
    await user.keyboard("{Enter}");

    expectOnlyColorPreference("dark");
    expect(control).toHaveAccessibleName(/switch.*light.*mode/i);
  });

  test("toggles on an existing role home without changing its exact session or route", async () => {
    preferDark(false);
    const exactSession = { role: "attendee", displayName: "Synthetic Attendee" };
    seedActor("attendee", exactSession.displayName);
    const user = userEvent.setup();
    await renderPrototype("/attendee");

    await user.click(appearanceControl());

    expect(window.location.pathname).toBe("/attendee");
    expect(screen.getByText("Synthetic Attendee")).toBeVisible();
    expect(auth.current).toMatchObject(exactSession);
    expectOnlyColorPreference("dark");
    expectEffectiveMode("dark");
  });

  test("falls back safely when reading the saved preference throws", async () => {
    preferDark(true);
    const exactSession = { role: "business", displayName: "Synthetic Business" };
    seedActor("business", exactSession.displayName);
    const nativeGet = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key) {
      if (this === window.localStorage && key === colorModeKey) throw new DOMException("blocked", "SecurityError");
      return nativeGet.call(this, key);
    });

    await renderPrototype("/business");

    expect(window.location.pathname).toBe("/business");
    expectEffectiveMode("dark");
    expect(auth.current).toMatchObject(exactSession);
  });

  test("keeps immediate mode and form state without claiming persistence when writing throws", async () => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype("/register/attendee");
    await user.type(screen.getByLabelText(/display name/i), "Write Failure Person");
    await user.type(screen.getByLabelText(/^username$/i), "write-user");
    await user.type(screen.getByLabelText(/^email$/i), "write@example.test");
    await user.type(screen.getByLabelText(/^password$/i), "WriteFail-123");
    await user.type(screen.getByLabelText(/confirm password/i), "WriteFail-123");
    const nativeSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (this === window.localStorage && key === colorModeKey) throw new DOMException("blocked", "QuotaExceededError");
      return nativeSet.call(this, key, value);
    });

    await user.click(appearanceControl());

    expectEffectiveMode("dark");
    expect(window.localStorage).toHaveLength(0);
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Write Failure Person");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("write-user");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("write@example.test");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("WriteFail-123");
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue("WriteFail-123");
    expect(window.sessionStorage).toHaveLength(0);
  });

  test("keeps an exact active session and home when preference persistence fails", async () => {
    preferDark(false);
    const exactSession = { role: "organiser", displayName: "Synthetic Organiser" };
    seedActor("organiser", exactSession.displayName);
    const user = userEvent.setup();
    await renderPrototype("/organiser");
    const nativeSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (this === window.localStorage && key === colorModeKey) throw new DOMException("blocked", "QuotaExceededError");
      return nativeSet.call(this, key, value);
    });

    await user.click(appearanceControl());

    expectEffectiveMode("dark");
    expect(window.location.pathname).toBe("/organiser");
    expect(screen.getByText("Synthetic Organiser")).toBeVisible();
    expect(window.sessionStorage).toHaveLength(0);
    expect(auth.current).toMatchObject(exactSession);
    expect(window.localStorage).toHaveLength(0);
    expect(Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))).not.toContain(sessionKey);
    expect(screen.queryByText(/preference saved|appearance saved|saved successfully/i)).not.toBeInTheDocument();
  });

  test("renders safely when invalid-preference cleanup throws without changing authority", async () => {
    preferDark(false);
    window.localStorage.setItem(colorModeKey, "invalid-mode");
    const exactSession = { role: "attendee", displayName: "Synthetic Attendee" };
    seedActor("attendee", exactSession.displayName);
    const nativeRemove = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (this: Storage, key) {
      if (this === window.localStorage && key === colorModeKey) throw new DOMException("blocked", "SecurityError");
      return nativeRemove.call(this, key);
    });

    await renderPrototype("/attendee");

    expect(window.location.pathname).toBe("/attendee");
    expectEffectiveMode("light");
    expect(window.localStorage.getItem(colorModeKey)).toBe("invalid-mode");
    expect(auth.current).toMatchObject(exactSession);
  });
});

describe("revision 2 AC09 representative typography and palette", () => {
  test.each([360, 1280])("uses enlarged readable hierarchy at %d CSS px", async (width) => {
    preferDark(false);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
    await renderPrototype();

    const bodySize = representativePixels(getComputedStyle(document.body).fontSize);
    const heading = screen.getByRole("heading", { level: 1 });
    const headingSize = representativePixels(getComputedStyle(heading).fontSize);
    expect(bodySize).toBeGreaterThanOrEqual(24);
    expect(headingSize).toBeGreaterThan(bodySize);
    expect(getComputedStyle(document.body).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(document.body).color).not.toBe(getComputedStyle(document.body).backgroundColor);
  });

  test.each(["attendee", "business"] as const)("scales representative %s registration form text", async (kind) => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype(`/register/${kind}`);
    expectMinimumTextSize(document.body, 24);
    for (const input of screen.getAllByRole("textbox")) expectMinimumTextSize(input, 24);
    expectMinimumTextSize(screen.getByLabelText(/^password$/i), 24);
    expectMinimumTextSize(screen.getByLabelText(/confirm password/i), 24);
    expectMinimumTextSize(screen.getByRole("button", { name: /create account/i }), 21);
    auth.failure = { status: 409, detail: "Registration could not be completed." };
    await user.type(screen.getByLabelText(/display name/i), "Readable Person");
    await user.type(screen.getByLabelText(/^username$/i), "readable-user");
    await user.type(screen.getByLabelText(/^email$/i), "readable@example.test");
    if (kind === "business") await user.type(screen.getByLabelText(/business name/i), "Readable Studio");
    await user.type(screen.getByLabelText(/^password$/i), "Readable-123");
    await user.type(screen.getByLabelText(/confirm password/i), "Readable-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Registration could not be completed.");
    expectReadableAlertText(alert);
    expect(window.location.pathname).toBe(`/register/${kind}`);
    expect(auth.current).toBeNull();
  });

  test("scales representative login form, tabs, controls and server error text", async () => {
    preferDark(false);
    const user = userEvent.setup();
    await renderPrototype("/login");
    expectMinimumTextSize(document.body, 24);
    expectMinimumTextSize(screen.getByLabelText(/username or email/i), 24);
    expectMinimumTextSize(screen.getByLabelText(/^password$/i), 24);
    for (const tab of screen.getAllByRole("tab")) expectMinimumTextSize(tab, 21.6);
    expectMinimumTextSize(screen.getByRole("button", { name: /log in/i }), 21);
    expectMinimumTextSize(appearanceControl(), 21);
    auth.failure = { status: 401, detail: "Invalid credentials." };
    await user.type(screen.getByLabelText(/username or email/i), "readable-user");
    await user.type(screen.getByLabelText(/^password$/i), "Readable-123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid credentials.");
    expectReadableAlertText(alert);
    expect(window.location.pathname).toBe("/login");
    expect(auth.current).toBeNull();
  });

  test.each([
    ["attendee", "Browse Programme", "Explore activities, discover new interests and find your next great experience."],
    ["organiser", "Programme Management", "Shape the activities and experiences that bring your event to life."],
    ["business", "Applications", "Keep track of your business’s next event opportunities and applications."],
  ] as const)("scales representative %s home navigation, cards and status text", async (role, cardTitle, description) => {
    preferDark(false);
    const user = userEvent.setup();
    seedActor(role, `Synthetic ${role}`);
    await renderPrototype(`/${role}`);
    expectMinimumTextSize(document.body, 24);
    expectMinimumTextSize(document.querySelector("header")?.querySelector("p") ?? document.querySelector("header")!, 21);
    expectMinimumTextSize(screen.getByRole("button", { name: /sign out/i }), 21);
    expectMinimumTextSize(appearanceControl(), 21);
    expectMinimumTextSize(screen.getByText(cardTitle), 27);
    expectMinimumTextSize(screen.getByText(description), 21);
    expectMinimumTextSize(screen.getByText(role === "attendee" ? "03 / PREVIEWS" : "01 / AVAILABLE · 02 / PREVIEWS"), 18);
    expectMinimumTextSize(screen.getAllByRole("button", { name: /coming later/i })[0], 21);
    const actorBeforeFailure = auth.current;
    auth.failure = { status: 500, detail: "Request could not be completed." };
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Request could not be completed.");
    expectReadableAlertText(alert);
    expect(window.location.pathname).toBe(`/${role}`);
    expect(auth.current).toEqual(actorBeforeFailure);
  });
});
