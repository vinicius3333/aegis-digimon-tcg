// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { areCutInsEnabled } from "../design/cutIn";
import { ArenaDemo } from "./ArenaDemo";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20");
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("plays the first fresh attack through real GameScreen and restores manual purchases when closed", async () => {
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Draw your card" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Automatically preview keywords" }));
  expect(container.querySelector(".aegis-arena-demo-toolbar")!.hasAttribute("inert")).toBe(true);
  expect(screen.queryByTestId("attack-announcement")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Pause after this scene" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(650);
  });
  expect(screen.getByTestId("attack-announcement").textContent).toContain("Plutomon");
  expect(screen.getByRole("button", { name: /1\/44 · Blocker/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close playback and return to the demo" }));
  expect(container.querySelector(".aegis-arena-demo-toolbar")!.hasAttribute("inert")).toBe(false);
  expect(container.querySelectorAll(".game-hand-card")).toHaveLength(21);
  expect(screen.queryByRole("region", { name: "Visual keyword playback" })).toBeNull();
});

it("shows a real Blast cut-in despite the default preference and contextual attack scenes", async () => {
  const saved = areCutInsEnabled();
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Automatically preview keywords" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause after this scene" }));
  fireEvent.click(screen.getByRole("button", { name: /1\/44 · Blocker/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a keyword" }), { target: { value: "25" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(container.querySelector(".game-cut-in")).toBeTruthy();
  expect(areCutInsEnabled()).toBe(saved);
  fireEvent.click(screen.getByRole("button", { name: /26\/44 · Blast Digivolve/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a keyword" }), { target: { value: "43" } });
  expect(screen.getByRole("button", { name: /44\/44 · Succession · Interaction scene/ })).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(650);
  });
  expect(container.querySelector(".game-cut-in")).toBeNull();
  expect(screen.getByTestId("attack-announcement")).toBeTruthy();
});

it("renders a drawn fixture card through GameScreen with complete hand affordances", async () => {
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Automatically preview keywords" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause after this scene" }));
  fireEvent.click(screen.getByRole("button", { name: /1\/44 · Blocker/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a keyword" }), { target: { value: "27" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000);
  });
  expect(container.querySelectorAll(".game-hand-card")).toHaveLength(21);
  expect(screen.getByRole("region", { name: "Visual keyword playback" })).toBeTruthy();
});

it("shows Recovery landing and the sixth own security card", async () => {
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Automatically preview keywords" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause after this scene" }));
  fireEvent.click(screen.getByRole("button", { name: /1\/44 · Blocker/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a keyword" }), { target: { value: "30" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(650);
  });
  expect(container.querySelector(".game-security-shield--you.game-security-shield--landing")).toBeTruthy();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5350);
  });
  expect(container.querySelector(".game-security-shield--you .game-security-shield__count")?.textContent).toBe("6");
  expect(container.querySelector(".game-security-shield--you .game-security-shield__face-up")).toBeNull();
});
