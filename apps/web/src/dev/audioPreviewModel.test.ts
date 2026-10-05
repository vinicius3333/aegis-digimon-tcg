import { expect, it } from "vitest";
import { candidateTracks, comparisonVolume } from "./audioPreviewModel";

it("balances measured comparisons through attenuation without boosting quiet or unmeasured sources", () => {
  expect(comparisonVolume(0.25, { rms: 0.254, peak: 1 }, true)).toBeCloseTo((0.25 * 0.015) / 0.254);
  expect(comparisonVolume(0.25, { rms: 0.01, peak: 0.045 }, true)).toBe(0.25);
  expect(comparisonVolume(0.25, {}, true)).toBe(0.25);
  expect(comparisonVolume(0.25, { rms: 0.254, peak: 1 }, false)).toBe(0.25);
});

it("identifies the applied track by exact runtime asset identity rather than a selected label", () => {
  const manifest = {
    selectedId: "new",
    candidates: [
      { id: "old", label: "Current", url: "/audio/music.wav?v=old", metrics: { peak: 0.2 } },
      { id: "new", label: "New", url: "/audio/music.wav?v=new", seconds: 40, bpm: 104 },
    ],
  };
  expect(candidateTracks(manifest, "/audio/music.wav?v=old").map((track) => [track.id, track.applied])).toEqual([
    ["old", true],
    ["new", false],
  ]);
});

it("rejects external and traversal candidate paths and preserves the usable runtime fallback", () => {
  const rows = ["https://example.com/song.wav", "//example.com/song.wav", "../reference.wav", "/audio/../secret"];
  expect(candidateTracks({ candidates: rows.map((url) => ({ url })) }, "/audio/applied.wav")).toEqual([
    { id: "applied", label: "Applied game score", url: "/audio/applied.wav", metrics: {}, applied: true },
  ]);
});

it("supports generated relative files without inventing missing or invalid measurements", () => {
  const tracks = candidateTracks(
    { candidates: [{ id: "candidate", file: "fresh.wav", metrics: { seconds: 30, rms: Number.NaN } }] },
    "/audio/applied.wav",
  );
  expect(tracks[1]).toMatchObject({ url: "/audio/music-candidates/fresh.wav", seconds: 30, applied: false });
  expect(tracks[1]!.metrics.rms).toBeUndefined();
  expect(candidateTracks(null, "/audio/applied.wav")).toHaveLength(1);
});
