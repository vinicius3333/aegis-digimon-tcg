import { describe, expect, it } from "vitest";
import { handOverlap } from "./boardPieces";

const CARD_WIDTH = 132;
const MIN_OVERLAP = 34;
/** What the fan actually occupies, tilted end cards included. */
const fannedWidth = (cards: number, overlap: number, cardWidth = CARD_WIDTH) => cardWidth * cards - overlap * (cards - 1) + 40;

describe("hand fan overlap", () => {
  it("keeps the printed spacing while the hand fits", () => {
    expect(handOverlap(5, 900)).toBe(MIN_OVERLAP);
    expect(handOverlap(1, 300)).toBe(MIN_OVERLAP);
  });

  it("tightens the fan until it fits the dock", () => {
    for (const [cards, width] of [[7, 600], [10, 700], [12, 520]] as const) {
      const overlap = handOverlap(cards, width);
      expect(overlap).toBeGreaterThan(MIN_OVERLAP);
      expect(fannedWidth(cards, overlap)).toBeLessThanOrEqual(width);
    }
  });

  it("never hides a card past its cost and level corner", () => {
    expect(handOverlap(20, 200)).toBeLessThanOrEqual(CARD_WIDTH - 30);
  });

  it("scales the spacing with the compact card the tablet dock uses", () => {
    const overlap = handOverlap(8, 520, 104);
    expect(overlap).toBeGreaterThan(0);
    expect(fannedWidth(8, overlap, 104)).toBeLessThanOrEqual(520);
  });

  it("keeps a whole touch target visible when the pointer is a finger", () => {
    const TOUCH_EXPOSURE = 44;
    const overlap = handOverlap(20, 200, 104, TOUCH_EXPOSURE);
    expect(overlap).toBeLessThanOrEqual(104 - TOUCH_EXPOSURE);
  });

  it("falls back to the printed spacing before the dock is measured", () => {
    expect(handOverlap(8, 0)).toBe(MIN_OVERLAP);
  });
});
