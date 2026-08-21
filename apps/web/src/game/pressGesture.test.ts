// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { pressGesture, swallowNextClick } from "./pressGesture";

describe("reading a moving press", () => {
  it("keeps a finger's ordinary wobble a press", () => {
    // A tap that moved 9px used to be read as a drag, and the drag landed on no drop
    // zone — so tapping a hand card did nothing at all.
    expect(pressGesture({ dx: 2, dy: -9, touch: true })).toBe("press");
    expect(pressGesture({ dx: 6, dy: 8, touch: true })).toBe("press");
  });

  it("holds a mouse to its steadier hand", () => {
    expect(pressGesture({ dx: 2, dy: -9, touch: false })).toBe("drag");
    expect(pressGesture({ dx: 1, dy: 3, touch: false })).toBe("press");
  });

  it("hands a sideways swipe back to the row the card sits in", () => {
    expect(pressGesture({ dx: -40, dy: 6, touch: true })).toBe("scroll");
    // A mouse has no row to pan, so sideways is still a drag.
    expect(pressGesture({ dx: -40, dy: 6, touch: false })).toBe("drag");
  });

  it("reads a pull towards the board as a drag", () => {
    expect(pressGesture({ dx: 8, dy: -60, touch: true })).toBe("drag");
  });
});

describe("the click that follows a tap", () => {
  const clicks = () => {
    const seen = vi.fn<(event: MouseEvent) => void>();
    const target = document.createElement("button");
    target.addEventListener("click", seen);
    document.body.append(target);
    return { seen, target };
  };

  it("never reaches whatever the tap put under the finger", () => {
    const { seen, target } = clicks();
    swallowNextClick();
    target.click();
    expect(seen).not.toHaveBeenCalled();
  });

  it("lets the next real click through", () => {
    const { seen, target } = clicks();
    swallowNextClick();
    target.click();
    target.click();
    expect(seen).toHaveBeenCalledOnce();
  });
});
