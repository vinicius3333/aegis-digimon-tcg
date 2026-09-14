// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { areCutInsEnabled, setCutInsEnabled } from "../design/cutIn";
import { I18nProvider } from "../i18n";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { ArenaDemo } from "./ArenaDemo";

const fixture = vi.hoisted(() => ({ batches: [] as readonly ServerBatch[] }));

// Supply a fresh server event to manual mode, which normally has no live room.
// Rendering and the preference decision still use the real GameScreen/cue pipeline.
vi.mock("../game/useMatchCues", async (importOriginal) => {
  const original = await importOriginal<typeof import("../game/useMatchCues")>();
  return {
    ...original,
    useMatchCues(options: Parameters<typeof original.useMatchCues>[0]) {
      return original.useMatchCues({ ...options, batches: [...options.batches, ...fixture.batches] });
    },
  };
});

let savedPreference: boolean;
beforeEach(() => {
  savedPreference = areCutInsEnabled();
  fixture.batches = [];
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20");
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  fixture.batches = [];
  setCutInsEnabled(savedPreference);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const digivolution: ServerEvent = {
  kind: "digivolved",
  seat: 0,
  permanentId: "you-chronomon",
  cardId: "BT26-016",
  mechanic: "blast",
};

it("keeps the evolving Digimon cut-in off with the default preference", async () => {
  expect(areCutInsEnabled()).toBe(false);
  const ui = () => (
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>
  );
  const { container, rerender } = render(ui());
  fixture.batches = [singleServerBatch([{ ...digivolution, cardId: "ST1-06", mechanic: "normal" }], 1)];
  rerender(ui());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(container.querySelector(".game-cut-in")).toBeNull();
});

it.each([false, true])("respects saved manual cut-ins=%s before and after forced visual playback", async (enabled) => {
  setCutInsEnabled(enabled);
  const stored = localStorage.getItem("aegis.digivolution-cut-in.enabled");
  const ui = () => (
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>
  );
  const { container, rerender } = render(ui());
  fixture.batches = [singleServerBatch([digivolution], 1)];
  rerender(ui());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(Boolean(container.querySelector(".game-cut-in"))).toBe(enabled);

  fixture.batches = [];
  fireEvent.click(screen.getByRole("button", { name: "Demo tools" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Automatically preview keywords" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause after this scene" }));
  fireEvent.click(screen.getByRole("button", { name: /1\/44 · Blocker/ }));
  fireEvent.change(screen.getByRole("combobox", { name: "Choose a keyword" }), { target: { value: "25" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(container.querySelector(".game-cut-in")).toBeTruthy();
  expect(localStorage.getItem("aegis.digivolution-cut-in.enabled")).toBe(stored);

  fireEvent.click(screen.getByRole("button", { name: "Close playback and return to the demo" }));
  fixture.batches = [singleServerBatch([digivolution], 1)];
  rerender(ui());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(750);
  });
  expect(Boolean(container.querySelector(".game-cut-in"))).toBe(enabled);
  expect(areCutInsEnabled()).toBe(enabled);
  expect(localStorage.getItem("aegis.digivolution-cut-in.enabled")).toBe(stored);
});
