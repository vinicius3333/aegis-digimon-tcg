import { expect, it } from "vitest";
import {
  DRAW_VIEWER_SEQUENCE,
  DRAW_OPPONENT_SEQUENCE,
  drawOpponentSequenceForSource,
  drawViewerSequenceForSource,
  HAND_HOVER_GEOMETRY,
  handHoverGeometryForSource,
  relativeCardGeometry,
} from "./motionGeometryModel";

it("distinguishes the observed fixed-anchor lift from a layout-cancelled pivot", () => {
  const result = relativeCardGeometry(HAND_HOVER_GEOMETRY.rest, HAND_HOVER_GEOMETRY.focused);
  expect(result.scaleX).toBeCloseTo(1.2, 8);
  expect(result.scaleY).toBeCloseTo(1.2, 8);
  expect(result.deltaX).toBeCloseTo(-0.6, 8);
  expect(result.deltaY).toBeCloseTo(-70.8, 8);
  const fixedAnchorLift = -0.42 * 140 * 1.2;
  const layoutCancelledLift = -0.42 * 140 * (1.2 - 1);
  expect(Math.abs(result.deltaY - fixedAnchorLift)).toBeLessThan(HAND_HOVER_GEOMETRY.uncertaintyPx);
  expect(Math.abs(result.deltaY - layoutCancelledLift)).toBeGreaterThan(50);
});

it("keeps draw markers bound to the inspected primary frames", () => {
  const source = {
    id: DRAW_VIEWER_SEQUENCE.reference,
    sourceHash: DRAW_VIEWER_SEQUENCE.sourceHash,
    frameWidth: 960,
    frameHeight: 540,
  };
  expect(drawViewerSequenceForSource(source)).toBe(DRAW_VIEWER_SEQUENCE);
  expect(DRAW_VIEWER_SEQUENCE.lastFrame - DRAW_VIEWER_SEQUENCE.firstFrame + 1).toBe(40);
  expect(DRAW_VIEWER_SEQUENCE.markers.map(({ frame }) => frame)).toEqual([1720, 1724, 1730, 1732, 1738]);
  expect(drawViewerSequenceForSource({ ...source, sourceHash: "replacement" })).toBeUndefined();
  expect(drawViewerSequenceForSource({ ...source, frameHeight: 1080 })).toBeUndefined();
  expect(drawViewerSequenceForSource({ ...source, id: "another-video" })).toBeUndefined();
});

it("rejects pose guides after replacing or resizing the video under the same id", () => {
  const source = {
    id: HAND_HOVER_GEOMETRY.reference,
    sourceHash: HAND_HOVER_GEOMETRY.sourceHash,
    frameWidth: 960,
    frameHeight: 540,
  };
  expect(handHoverGeometryForSource(source)).toBe(HAND_HOVER_GEOMETRY);
  expect(handHoverGeometryForSource({ ...source, sourceHash: "replacement" })).toBeUndefined();
  expect(handHoverGeometryForSource({ ...source, frameWidth: 1920 })).toBeUndefined();
  expect(handHoverGeometryForSource({ ...source, id: "another-video" })).toBeUndefined();
});

it("rejects opponent entry observations after replacing the source or decode dimensions", () => {
  const source = {
    id: DRAW_OPPONENT_SEQUENCE.reference,
    sourceHash: DRAW_OPPONENT_SEQUENCE.sourceHash,
    frameWidth: 960,
    frameHeight: 540,
  };
  expect(drawOpponentSequenceForSource(source)).toBe(DRAW_OPPONENT_SEQUENCE);
  expect(drawOpponentSequenceForSource({ ...source, sourceHash: "replacement" })).toBeUndefined();
  expect(drawOpponentSequenceForSource({ ...source, frameWidth: 1920 })).toBeUndefined();
  expect(drawOpponentSequenceForSource({ ...source, id: "another" })).toBeUndefined();
});
