import { describe, expect, it } from "vitest";
import { frameAtTime, frameAtMediaTime, parseMotionManifest } from "./motionReferenceModel";

const manifest = {
  version: 1,
  id: "fixture",
  title: "Variable frame rate",
  width: 1920,
  height: 1080,
  frameWidth: 960,
  frameHeight: 540,
  duration: 0.2,
  fps: 60,
  timestamps: [0, 0.016683, 0.05005, 0.1001],
};

describe("decoded reference frames", () => {
  it("matches browser timestamps when ffprobe rounded a frame timestamp up", () => {
    const timestamps = [0, 0.016667, 0.033333];
    expect(frameAtMediaTime(timestamps, 1 / 60)).toBe(1);
    expect(frameAtMediaTime(timestamps, 2 / 60)).toBe(2);
    expect(frameAtMediaTime(timestamps, 0.016665)).toBe(0);
    expect(frameAtTime(timestamps, 1 / 60)).toBe(0);
  });
  it("uses actual nonuniform timestamps and clamps both ends", () => {
    const { timestamps } = parseMotionManifest(manifest);
    expect([-1, 0, 0.016683, 0.04, 0.05005, 10].map((time) => frameAtTime(timestamps, time))).toEqual([
      0, 0, 1, 1, 2, 3,
    ]);
  });
  it("rejects missing, unsafe and out-of-order frame manifests", () => {
    for (const invalid of [
      null,
      {},
      { ...manifest, id: "../private" },
      { ...manifest, timestamps: [] },
      { ...manifest, timestamps: [0, 0] },
      { ...manifest, timestamps: [0.1, 0.05] },
      { ...manifest, timestamps: [0, Number.NaN] },
      { ...manifest, duration: 0.02 },
    ])
      expect(() => parseMotionManifest(invalid)).toThrow(/Manifest/);
  });
});
