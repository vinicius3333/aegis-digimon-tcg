import { describe, expect, it } from "vitest";
import { pressGesture } from "./pressGesture";

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
