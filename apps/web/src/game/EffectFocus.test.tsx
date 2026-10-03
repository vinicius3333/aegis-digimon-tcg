// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EffectFocus } from "./EffectFocus";
import type { EffectActivation } from "./effectSource";

let frames: Map<number, FrameRequestCallback>;
let frameId: number;

beforeEach(() => {
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

function fixture() {
  const root = document.createElement("div");
  const permanent = document.createElement("div");
  permanent.innerHTML = '<div class="game-card-enter"><div data-state="default"></div></div>';
  root.append(permanent);
  document.body.append(root);
  const fieldRect = vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 800, 600));
  vi.spyOn(permanent, "getBoundingClientRect").mockReturnValue(new DOMRect(120, 150, 160, 210));
  const printedCard = permanent.querySelector<HTMLDivElement>("[data-state]")!;
  vi.spyOn(printedCard, "getBoundingClientRect").mockReturnValue(new DOMRect(130, 160, 140, 100));
  const sources: readonly EffectActivation[] = [
    { key: 1, seat: 0, cardId: "BT1-010", site: { zone: "field", permanentId: "source" } },
  ];
  const props = {
    sources,
    field: { current: root },
    permanents: { current: { source: permanent } },
    choosingTargets: false,
  };
  const view = render(<EffectFocus {...props} />);
  return { ...view, props, fieldRect, permanent };
}

describe("EffectFocus", () => {
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
