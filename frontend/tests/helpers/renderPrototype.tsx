import type { ComponentType } from "react";
import { render } from "@testing-library/react";
import { expect, vi } from "vitest";
import type userEvent from "@testing-library/user-event";

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

  return render(<Application />);
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
