import { expect, it } from "vitest";
import { candidateTracks, comparisonVolume, cueComparisons } from "./audioPreviewModel";

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

it("only offers cue comparisons whose current bank, physical metadata and segment match gameplay", () => {
  const url = "/audio/current.wav?v=bank";
  const cues = { "digivolve-3-6": { offset: 2, duration: 0.9 } };
  const example = {
    key: "digivolve-3-6",
    label: "Evolution",
    kind: "digivolve",
    details: { sourceLevel: 3, targetLevel: 6 },
    previous: { url: "/audio/previews/previous.wav?v=old" },
    current: cues["digivolve-3-6"],
  };
  const manifest = { current: { url }, examples: [example] };
  expect(cueComparisons(manifest, url, cues)).toMatchObject([{ key: example.key, details: example.details }]);
  expect(cueComparisons(manifest, "/audio/current.wav?v=new", cues)).toEqual([]);
  for (const changed of [
    { ...example, current: { offset: 2.1, duration: 0.9 } },
    { ...example, details: { sourceLevel: 4, targetLevel: 6 } },
    { ...example, kind: "draw" },
    { ...example, previous: { url: "https://example.com/sample.wav" } },
    { ...example, previous: { url: "/audio/../private.wav" } },
  ])
    expect(cueComparisons({ ...manifest, examples: [changed] }, url, cues)).toEqual([]);
});
