// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EffectFocus } from "./EffectFocus";
import type { EffectActivation } from "./effectSource";
import { playSound } from "../design/sound";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

let frames: Map<number, FrameRequestCallback>;
let frameId: number;

beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function nextFrame() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(16);
  });
}

function fixture(overrides: { choosingTargets?: boolean; cardRect?: DOMRect } = {}) {
  const root = document.createElement("div");
  const permanent = document.createElement("div");
  permanent.innerHTML = '<div class="game-card-enter"><div data-state="default"></div></div>';
  root.append(permanent);
  document.body.append(root);
  const fieldRect = vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 800, 600));
  vi.spyOn(permanent, "getBoundingClientRect").mockReturnValue(new DOMRect(120, 150, 160, 210));
  const printedCard = permanent.querySelector<HTMLDivElement>("[data-state]")!;
  const cardRect = vi
    .spyOn(printedCard, "getBoundingClientRect")
    .mockReturnValue(overrides.cardRect ?? new DOMRect(130, 160, 140, 100));
  const sources: readonly EffectActivation[] = [
    { key: 1, seat: 0, cardId: "BT1-010", site: { zone: "field", permanentId: "source" } },
  ];
  const props = {
    sources,
    board: { current: root },
    permanents: { current: { source: permanent } },
    choosingTargets: false,
  };
  const view = render(<EffectFocus {...props} choosingTargets={overrides.choosingTargets ?? false} />);
  return { ...view, props, fieldRect, cardRect, permanent };
}

describe("EffectFocus", () => {
  it("waits for a connected card with zero-sized bounds to become visible before sounding", () => {
    const view = fixture({ cardRect: new DOMRect(0, 0, 0, 0) });
    expect(screen.queryByTestId("effect-focus")).toBeNull();
    expect(playSound).not.toHaveBeenCalled();
    view.cardRect.mockReturnValue(new DOMRect(130, 160, 140, 100));
    nextFrame();
    expect(screen.getByTestId("effect-focus")).toBeTruthy();
    expect(playSound).toHaveBeenCalledExactlyOnceWith("effectFocus");
  });

  it("sounds each accepted field focus once, including another effect from the same card", () => {
    const view = fixture();
    expect(playSound).toHaveBeenCalledExactlyOnceWith("effectFocus");
    const firstPulse = screen.getByTestId("effect-focus").querySelector(".game-effect-focus__pulse");
    view.rerender(<EffectFocus {...view.props} sources={[...view.props.sources]} />);
    view.fieldRect.mockReturnValue(new DOMRect(50, 60, 800, 600));
    nextFrame();
    expect(playSound).toHaveBeenCalledTimes(1);
    view.rerender(<EffectFocus {...view.props} sources={[{ ...view.props.sources[0]!, key: 2 }]} />);
    expect(playSound).toHaveBeenCalledTimes(2);
    const secondPulse = screen.getByTestId("effect-focus").querySelector(".game-effect-focus__pulse");
    expect(secondPulse).not.toBe(firstPulse);
    expect(secondPulse?.getAttribute("data-activation-key")).toBe("2");
    view.rerender(<EffectFocus {...view.props} />);
    expect(playSound).toHaveBeenCalledTimes(2);
  });

  it("waits until focus becomes visible and stays silent for linked or disconnected sources", () => {
    const view = fixture({ choosingTargets: true });
    expect(playSound).not.toHaveBeenCalled();
    view.rerender(<EffectFocus {...view.props} />);
    expect(playSound).toHaveBeenCalledExactlyOnceWith("effectFocus");
    view.rerender(<EffectFocus {...view.props} sources={[{ ...view.props.sources[0]!, key: 2, linked: true }]} />);
    view.permanent.remove();
    view.rerender(<EffectFocus {...view.props} sources={[{ ...view.props.sources[0]!, key: 3 }]} />);
    nextFrame();
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("does not sound stale geometry when the next source is absent from the field", () => {
    const view = fixture();
    view.rerender(
      <EffectFocus
        {...view.props}
        sources={[{ ...view.props.sources[0]!, key: 2, site: { zone: "field", permanentId: "missing" } }]}
      />,
    );
    expect(screen.queryByTestId("effect-focus")).toBeNull();
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("cuts the hole around the transformed printed card, including a suspended rectangle", () => {
    const view = fixture();
    const overlay = screen.getByTestId("effect-focus");
    expect(overlay.getAttribute("data-source-card-id")).toBe("BT1-010");
    expect(overlay.getAttribute("data-source-permanent-id")).toBe("source");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    const hole = overlay.querySelector("mask rect[fill='black']")!;
    expect(["x", "y", "width", "height"].map((name) => hole.getAttribute(name))).toEqual(["103", "123", "154", "114"]);

    view.rerender(<EffectFocus {...view.props} choosingTargets />);
    expect(screen.queryByTestId("effect-focus")).toBeNull();
    expect(frames.size).toBe(0);
  });

  it("updates the mask when the field origin moves while the source stays at its viewport position", () => {
    const view = fixture();
    view.fieldRect.mockReturnValue(new DOMRect(50, 60, 800, 600));
    nextFrame();
    const hole = screen.getByTestId("effect-focus").querySelector("mask rect[fill='black']")!;
    expect(hole.getAttribute("x")).toBe("73");
    expect(hole.getAttribute("y")).toBe("93");
  });

  it("resizes the full board mask without moving the source aperture or replaying its sound", () => {
    const view = fixture();
    view.fieldRect.mockReturnValue(new DOMRect(20, 30, 800, 900));
    nextFrame();
    const overlay = screen.getByTestId("effect-focus");
    expect(overlay.getAttribute("viewBox")).toBe("0 0 800 900");
    expect(overlay.querySelector(".game-effect-focus__shade")?.getAttribute("height")).toBe("900");
    const hole = overlay.querySelector("mask rect[fill='black']")!;
    expect(hole.getAttribute("x")).toBe("103");
    expect(hole.getAttribute("y")).toBe("123");
    expect(playSound).toHaveBeenCalledExactlyOnceWith("effectFocus");
  });

  it("leaves linked narration sources at rest and removes focus when its card leaves the DOM", () => {
    const view = fixture();
    view.rerender(
      <EffectFocus {...view.props} sources={view.props.sources.map((source) => ({ ...source, linked: true }))} />,
    );
    expect(screen.queryByTestId("effect-focus")).toBeNull();
    view.rerender(<EffectFocus {...view.props} />);
    view.permanent.remove();
    nextFrame();
    expect(screen.queryByTestId("effect-focus")).toBeNull();
  });
});
