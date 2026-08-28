import { describe, expect, it } from "vitest";
import { SPOTLIGHT_PADDING_PX, spotlightHoles, type SpotlightSubject } from "./spotlight";

const card: SpotlightSubject = { id: "p1", x: 100, y: 40, width: 80, height: 112 };

describe("spotlightHoles", () => {
  it("pads a hole evenly around the card it lights", () => {
    const [hole] = spotlightHoles([card]);
    expect(hole).toMatchObject({
      id: "p1",
      x: 100 - SPOTLIGHT_PADDING_PX,
      y: 40 - SPOTLIGHT_PADDING_PX,
      width: 80 + SPOTLIGHT_PADDING_PX * 2,
      height: 112 + SPOTLIGHT_PADDING_PX * 2,
    });
  });

  it("swaps the sides for a suspended card and keeps its centre", () => {
    const [upright] = spotlightHoles([card]);
    const [turned] = spotlightHoles([{ ...card, suspended: true }]);
    expect(turned!.width).toBe(upright!.height);
    expect(turned!.height).toBe(upright!.width);
    expect(turned!.x + turned!.width / 2).toBe(upright!.x + upright!.width / 2);
    expect(turned!.y + turned!.height / 2).toBe(upright!.y + upright!.height / 2);
  });

  it("drops a subject that never laid out rather than punching a hole of nothing", () => {
    // jsdom reports zero boxes for everything, so this is the whole test
    // environment's shape as much as it is a real edge case.
    expect(spotlightHoles([{ id: "p1", x: 0, y: 0, width: 0, height: 0 }])).toEqual([]);
  });

  it("punches one hole per offered card", () => {
    expect(spotlightHoles([card, { ...card, id: "p2", x: 220 }])).toHaveLength(2);
  });
});
