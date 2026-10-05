import { expect, it } from "vitest";
import { handFocusPlane } from "./handFocusGeometry";

it.each([-12, 0, 12])(
  "keeps a %s-degree focused edge card inside the viewport without moving its resting plane",
  (angle) => {
    for (const centerX of [28, 160, 292]) {
      const input = { centerX, centerY: 800, width: 40, height: 56, angle, viewportWidth: 320 };
      const plane = handFocusPlane(input);
      const radians = (angle * Math.PI) / 180;
      const peakCenter = centerX + Math.sin(radians) * 0.42 * 56 * 1.3 + plane.safeX;
      const peakHalfWidth = (1.3 * (Math.abs(Math.cos(radians)) * 40 + Math.abs(Math.sin(radians)) * 56)) / 2;
      expect(peakCenter - peakHalfWidth).toBeGreaterThanOrEqual(8 - 1e-8);
      expect(peakCenter + peakHalfWidth).toBeLessThanOrEqual(312 + 1e-8);
      expect(plane.centerX).toBe(centerX);
      expect(plane.centerY).toBe(800);
      expect(plane.width).toBe(40);
      expect(plane.height).toBe(56);
      expect(plane.angle).toBe(angle);
    }
  },
);

it("adds no viewport correction when the complete enlarged fan face already fits", () => {
  expect(
    handFocusPlane({ centerX: 720, centerY: 830, width: 76, height: 106.4, angle: -8, viewportWidth: 1440 }).safeX,
  ).toBe(0);
});
