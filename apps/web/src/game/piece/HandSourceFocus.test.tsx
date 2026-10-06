// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HandSourceFocus } from "./HandSourceFocus";
import type { EffectActivation } from "../effectSource";
import type { HandEntry } from "./types";

vi.mock("../../design/cards", () => ({
  CardFull: ({ cardId, artId, selected }: { cardId: string; artId?: string; selected: boolean }) => (
    <div data-card-id={cardId} data-art-id={artId} data-selected={selected} />
  ),
}));

const entry: HandEntry = {
  cardId: "ST1-03",
  instanceId: "physical-source",
  artId: "source-art",
  playableFromHand: false,
  projectedPlayCost: -1,
  activatableEffectsJson: "[]",
  digivolveTargetPermanentIds: [],
  linkTargetPermanentIds: [],
};
const source: EffectActivation = {
  key: 5,
  seat: 0,
  cardId: entry.cardId,
  site: { zone: "hand", instanceId: entry.instanceId },
  motionScale: 0.55,
};
let row: HTMLDivElement;
let slot: HTMLDivElement;
let centerY: number;
const frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  centerY = 500;
  vi.stubGlobal(
    "DOMMatrix",
    class {
      a = 1;
      b = 0;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = frames.size + 1;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  row = document.createElement("div");
  slot = document.createElement("div");
  slot.dataset.handInstanceId = entry.instanceId;
  const face = document.createElement("div");
  face.style.width = "100px";
  face.style.height = "140px";
  slot.append(face);
  row.append(slot);
  document.body.append(row);
  for (const element of [slot, face])
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() => new DOMRect(200, centerY - 70, 100, 140));
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 400, 600, 200));
});
afterEach(() => {
  cleanup();
  row.remove();
  frames.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps the same physical/art face and speed clock across clause linkage, then releases the portal", () => {
  const ready = vi.fn<(key: number) => void>();
  const { rerender, unmount } = render(
    <HandSourceFocus source={source} entry={entry} row={row} onReady={ready} selected />,
  );
  const focus = document.querySelector(".game-hand-source-focus")!;
  const anchor = focus.firstElementChild as HTMLElement;
  expect(focus.getAttribute("data-instance-id")).toBe("physical-source");
  expect(focus.querySelector('[data-art-id="source-art"][data-selected="true"]')).toBeTruthy();
  expect(anchor.style.getPropertyValue("--t-hand-focus-scale")).toBe("275ms");
  rerender(
    <HandSourceFocus
      source={{ ...source, linked: true, motionScale: 1 }}
      entry={entry}
      row={row}
      onReady={ready}
      selected
    />,
  );
  expect(document.querySelector(".game-hand-source-focus")).toBe(focus);
  expect(anchor.className).not.toContain("settled");
  expect(anchor.style.getPropertyValue("--t-hand-focus-scale")).toBe("275ms");
  expect(focus.getAttribute("data-linked")).toBe("true");
  unmount();
  expect(document.querySelector(".game-hand-source-focus")).toBeNull();
  expect(row.children).toHaveLength(1);
});

it("revisits a linked occurrence in its final pose without another enlargement", () => {
  render(
    <HandSourceFocus
      source={{ ...source, linked: true }}
      entry={entry}
      row={row}
      onReady={vi.fn<(key: number) => void>()}
    />,
  );
  expect(document.querySelector(".game-hand-source-focus__anchor")?.className).toContain("settled");
});

it("releases hover only when the scale-and-hold animation finishes, not after the pivot", () => {
  const prepared = vi.fn<(key: number) => void>();
  render(
    <HandSourceFocus
      source={source}
      entry={entry}
      row={row}
      onReady={vi.fn<(key: number) => void>()}
      onPrepared={prepared}
    />,
  );
  function dispatchEnd(selector: string, name: string) {
    const event = new Event("animationend", { bubbles: true });
    Object.defineProperty(event, "animationName", { value: name });
    fireEvent(document.querySelector(selector)!, event);
  }
  dispatchEnd(".game-hand-source-focus__pivot", "battle-hand-focus-pivot");
  expect(prepared).not.toHaveBeenCalled();
  dispatchEnd(".game-hand-source-focus__scale", "battle-hand-focus-scale");
  expect(prepared).toHaveBeenCalledExactlyOnceWith(5);
});

it("follows a transform transition that was already running when the source mounted", () => {
  Object.defineProperty(slot, "getAnimations", {
    value: () => [{ transitionProperty: "transform", playState: "running" }],
  });
  const { unmount } = render(
    <HandSourceFocus source={source} entry={entry} row={row} onReady={vi.fn<(key: number) => void>()} />,
  );
  expect(frames.size).toBe(1);
  centerY = 470;
  const callback = [...frames.values()][0]!;
  // A browser removes the callback before invoking it.
  frames.clear();
  act(() => callback(16));
  expect((document.querySelector(".game-hand-source-focus__anchor") as HTMLElement).style.top).toBe("400px");
  unmount();
  expect(frames.size).toBe(0);
});
