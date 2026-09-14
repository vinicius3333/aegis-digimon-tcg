// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { TIMINGS } from "../game/timings";
import { ArenaDemo } from "./ArenaDemo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("previews five trigger timings and can repeat a deletion without losing its animation", async () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 100,
    bottom: 140,
    width: 100,
    height: 140,
    toJSON: () => ({}),
  });
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena");
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
  for (const timing of [
    "On Play",
    "When Digivolving",
    "When Attacking",
    "Start of Main Phase",
    "On Deletion",
    "On Deletion",
  ]) {
    fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
    fireEvent.click(screen.getByRole("menuitem", { name: `Preview activation: ${timing}` }));
    await advance(300);
    expect(screen.queryByText("Visual preview: the card glows before this notice.")).toBeNull();
    expect(container.querySelector(".game-delete-burst") !== null).toBe(timing === "On Deletion");
    if (timing !== "When Attacking")
      await advance(timing === "Start of Main Phase" ? TIMINGS.phaseBanner : TIMINGS.cardBurst);
    expect(container.querySelector(".game-permanent--effect-source,.game-pile--effect-source")).not.toBeNull();
    expect(screen.queryByText("Visual preview: the card glows before this notice.")).toBeNull();
    await advance(TIMINGS.effectSourceHold);
    expect(screen.getByText("Visual preview: the card glows before this notice.")).toBeTruthy();
  }
});
