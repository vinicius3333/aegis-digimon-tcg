// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { TIMINGS } from "../game/timings";
import { ArenaDemo } from "./ArenaDemo";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("replays unsuspend, one draw and breeding on the real demo board", async () => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena");
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const handSize = () => container.querySelectorAll(".game-hand-card").length;
  const banner = () => container.querySelector(".game-phase-banner")?.textContent;
  async function advance(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
  for (const expectedHand of [6, 7]) {
    fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Preview turn start" }));
    expect(screen.getByRole("button", { name: /Chronomon: Holy Mode \(Suspended\)/ })).toBeTruthy();
    expect(handSize()).toBe(expectedHand - 1);
    await advance(600);
    expect(banner()).toBe("Unsuspend Phase");
    expect(screen.queryByRole("button", { name: /Chronomon: Holy Mode \(Suspended\)/ })).toBeNull();
    expect(handSize()).toBe(expectedHand - 1);
    await advance(TIMINGS.phaseBanner);
    expect(banner()).toBe("Draw Phase");
    expect(handSize()).toBe(expectedHand);
    await advance(TIMINGS.phaseBanner);
    expect(banner()).toBe("Breeding Phase");
    expect((screen.getByRole("button", { name: "End breeding" }) as HTMLButtonElement).disabled).toBe(false);
    await advance(TIMINGS.phaseBanner);
    expect(banner()).toBeUndefined();
    expect(screen.getByRole("button", { name: "End breeding" }).getAttribute("aria-disabled")).toBeNull();
    expect((screen.getByRole("button", { name: "Demo tools" }) as HTMLButtonElement).disabled).toBe(false);
  }
});
