import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { auth } from "./fixtures/auth";

// Node 26 exposes an unavailable experimental `localStorage` global. Vitest's
// global bridge can replace jsdom's storage object with it, so use a persistent
// same-origin jsdom frame and expose its native Storage constructor as well.
function ensureBrowserStorage() {
  if (window.localStorage && window.sessionStorage) return;
  const frame = document.createElement("iframe");
  document.documentElement.append(frame);
  const frameWindow = frame.contentWindow;
  if (!frameWindow) throw new Error("The test browser could not create storage.");
  const FrameStorage = (frameWindow as unknown as { Storage: typeof Storage }).Storage;
  Object.defineProperties(window, {
    localStorage: { configurable: true, value: frameWindow.localStorage },
    sessionStorage: { configurable: true, value: frameWindow.sessionStorage },
    Storage: { configurable: true, value: FrameStorage },
  });
  Object.defineProperties(globalThis, {
    localStorage: { configurable: true, value: frameWindow.localStorage },
    sessionStorage: { configurable: true, value: frameWindow.sessionStorage },
    Storage: { configurable: true, value: FrameStorage },
  });
}

ensureBrowserStorage();

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/login");
  auth.reset();
});

afterEach(() => {
  cleanup();
});
