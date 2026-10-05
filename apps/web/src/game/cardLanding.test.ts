import { describe, expect, it } from "vitest";
import { CARD_LANDING_DEPTH, CARD_LANDING_MS, cardLandingPose } from "./cardLanding";

describe("projected card landing", () => {
  it("projects the authored30 canvas-unit drop rather than treating it as30 world units", () => {
    expect(CARD_LANDING_MS).toBe(100);
    expect(CARD_LANDING_DEPTH).toBeCloseTo(0.03195295983936, 8);
    const pose = cardLandingPose(0, 99, 0, 0);
    expect(pose.scale).toBeCloseTo(1.03300765201871, 8);
    // The source quaternion serializes a5deg rotation with float precision.
    expect(pose.y / 99).toBeCloseTo(-0.0272825906593, 7);
  });

  it("uses perspective and the actual side of the board instead of flipping by seat", () => {
    const viewer = cardLandingPose(0, 99, 120, 270);
    const opponent = cardLandingPose(0, 99, -120, -270);
    expect(viewer.x).toBeGreaterThan(0);
    expect(viewer.y).toBeGreaterThan(0);
    expect(opponent.x).toBeLessThan(0);
    expect(opponent.y).toBeLessThan(0);
  });

  it.each([0.363636363636, 0.727272727272, 0.909090909091, 1])(
    "returns to the unchanged printed face at the bounce contact t=%s",
    (t) => {
      const pose = cardLandingPose(t * 100, 72, 240, 150);
      expect(pose.scale).toBeCloseTo(1, 9);
      expect(pose.x).toBeCloseTo(0, 8);
      expect(pose.y).toBeCloseTo(0, 8);
    },
  );

  it("projects each rebound in depth before converting it to screen size", () => {
    const pose = cardLandingPose((1.5 / 2.75) * 100, 99, 0, 0);
    expect(pose.scale).toBeCloseTo(1.008052565592, 8);
    expect(pose.y).toBeLessThan(0);
    expect(cardLandingPose(200, 99, 10, 20)).toEqual({ scale: 1, x: 0, y: 0 });
  });
});
