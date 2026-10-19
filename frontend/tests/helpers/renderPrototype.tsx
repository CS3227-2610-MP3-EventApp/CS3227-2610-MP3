import type { ComponentType } from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { expect, vi } from "vitest";
import type userEvent from "@testing-library/user-event";
import { auth } from "../fixtures/auth";

const MissingApplication = () => <main data-testid="missing-application" />;

export async function renderPrototype(path = "/login") {
  window.history.replaceState({}, "", path);

  let Application: ComponentType = MissingApplication;
  try {
    const module = await vi.importActual<{ default: ComponentType }>("../../src/App");
    Application = module.default;
  } catch (error) {
    if (!(error instanceof Error) || !/src\/App|Failed to load url/.test(error.message)) {
      throw error;
    }
  }

  const result = render(<Application />);
  // Wait for the actor restoration contract, including redirects, before examining UI.
  await waitFor(() => expect(auth.requests.some(({ path }) => path === "/api/v1/auth/me")).toBe(true));
  await waitFor(() => expect(screen.queryByRole("heading", { level: 1 })).toBeInTheDocument());
  if (["/attendee", "/business", "/organiser"].includes(path) && !auth.current?.mustChangePassword) {
    if (auth.current?.role === path.slice(1)) {
      const permitted = auth.current.role === "attendee" || auth.current.eventMemberships.length > 0 || auth.current.businessMemberships.length > 0;
      if (permitted) await screen.findByText(auth.current.displayName);
    }
    else await waitFor(() => expect(window.location.pathname).toBe("/login"));
  }
  return result;
}

export function storedValues(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index);
    return key === null ? "" : `${key}:${storage.getItem(key) ?? ""}`;
  }).join("\n");
}

export async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  maximumTabs = 20,
) {
  for (let index = 0; index < maximumTabs && document.activeElement !== target; index += 1) {
    await user.tab();
  }
  expect(document.activeElement).toBe(target);
}
