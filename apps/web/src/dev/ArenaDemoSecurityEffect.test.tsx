// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { ArenaDemo } from "./ArenaDemo";
import { SECURITY_CHECK_REPLAY } from "./securityCheckReplay";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("replays the real check: the Tamer enters, the dock leaves, then its [On Play] reads", async () => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena");
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const advance = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Play security-effect scenario" }));

  // The reveal docks the card at some point before the [On Play] result is on screen.
  let docked = false;
  for (let elapsed = 0; elapsed < SECURITY_CHECK_REPLAY.length * 900 + 4000; elapsed += 100) {
    await advance(100);
    if (container.querySelector('[data-testid="security-branch"]')) docked = true;
    if (docked && container.querySelector(".side-panel__title")) break;
  }
  expect(docked).toBe(true);

  // By the end the Tamer is on the field, the dock has gone, and its panels have opened.
  await advance(SECURITY_CHECK_REPLAY.length * 900 + 4000);
  expect(container.querySelector('[data-testid="security-branch"]')).toBeNull();
  expect(container.textContent).toContain("Taiki Kudo");
  const titles = [...container.querySelectorAll(".side-panel__title")].map((node) => node.textContent);
  expect(titles).toContain("Revealed Cards");
});
