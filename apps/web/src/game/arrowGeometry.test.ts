import { describe, expect, it } from "vitest";
import { beamBetweenBoxes, clipToBox } from "./arrowGeometry";

describe("clipToBox", () => {
  it("stops at the edge of the box plus the gap, along the ray to the target", () => {
    const end = clipToBox({ x: 0, y: 0, halfWidth: 50, halfHeight: 70 }, { x: 400, y: 0 }, 6);
    expect(end).toEqual({ x: 56, y: 0 });
  });

  it("uses the horizontal edge when the ray leaves through the top or bottom", () => {
    const end = clipToBox({ x: 0, y: 0, halfWidth: 50, halfHeight: 70 }, { x: 0, y: -400 }, 6);
    expect(end).toEqual({ x: 0, y: -76 });
  });

  it("leaves a diagonal ray through whichever edge it meets first", () => {
    const end = clipToBox({ x: 0, y: 0, halfWidth: 50, halfHeight: 50 }, { x: 300, y: 300 }, 0);
    expect(end.x).toBeCloseTo(50);
    expect(end.y).toBeCloseTo(50);
  });

  it("treats a bare point as a box with no size", () => {
    expect(clipToBox({ x: 10, y: 20 }, { x: 110, y: 20 }, 6)).toEqual({ x: 16, y: 20 });
  });

  it("never reaches past the midpoint, so a short beam keeps its direction", () => {
    const end = clipToBox({ x: 0, y: 0, halfWidth: 50, halfHeight: 50 }, { x: 40, y: 0 }, 6);
    expect(end).toEqual({ x: 20, y: 0 });
  });

  it("returns the centre when both ends coincide", () => {
    expect(clipToBox({ x: 5, y: 5, halfWidth: 50, halfHeight: 50 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });
});

describe("beamBetweenBoxes", () => {
  it("clips both ends towards each other", () => {
    const beam = beamBetweenBoxes(
      { x: 0, y: 0, halfWidth: 40, halfHeight: 60 },
      { x: 500, y: 0, halfWidth: 30, halfHeight: 30 },
      10,
    );
    expect(beam.from).toEqual({ x: 50, y: 0 });
    expect(beam.to).toEqual({ x: 460, y: 0 });
  });
});
