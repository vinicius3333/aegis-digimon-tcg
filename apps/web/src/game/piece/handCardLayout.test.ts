import { describe, expect, it } from "vitest";
import { computeHandCardLayout, type HandCardLayoutParams } from "./handCardLayout";
import { HAND_MIN_EXPOSURE_TOUCH } from "./constants";
import { handOverlap } from "./handLayout";

const FOLDABLE_CARD_WIDTH = 104;
/** The dock left to a ten-card hand on an unfolded foldable (750x681 CSS px). */
const FOLDABLE_ROW_WIDTH = 365;

const layout = (overrides: Partial<HandCardLayoutParams>) =>
  computeHandCardLayout({
    index: 3,
    count: 10,
    overlap: 0,
    handOverflows: false,
    selected: false,
    hovered: false,
    dragging: false,
    ...overrides,
  });

describe("hand card touch gestures", () => {
  it("keeps the whole gesture for dragging while the fan fits its dock", () => {
    expect(layout({ handOverflows: false }).touchAction).toBe("none");
  });

  it("lets a finger swipe an overflowing hand on a foldable (Discord 1557141287948521624)", () => {
    const overlap = handOverlap(10, FOLDABLE_ROW_WIDTH, FOLDABLE_CARD_WIDTH, HAND_MIN_EXPOSURE_TOUCH);
    const fannedWidth = 10 * FOLDABLE_CARD_WIDTH - overlap * 9;
    expect(fannedWidth).toBeGreaterThan(FOLDABLE_ROW_WIDTH);

    expect(layout({ overlap, handOverflows: true }).touchAction).toBe("pan-x");
  });
});
