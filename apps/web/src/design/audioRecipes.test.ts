import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AUDIO_BANK_URL, AUDIO_CUES } from "./audioBank";
import {
  MUSIC_BPM,
  musicRecipe,
  SOUND_KINDS,
  audioRecipe,
  bankRecipes,
  cueKey,
  renderCue,
  renderMusic,
  decodeSourceWav,
} from "./audioRecipes";

const sourceRoot = new URL("../../public/audio/sources/", import.meta.url);
const sources = {
  sampleRate: 44100,
  paper: decodeSourceWav(readFileSync(new URL("paper-texture.wav", sourceRoot))).samples,
  impact: decodeSourceWav(readFileSync(new URL("impact-body.wav", sourceRoot))).samples,
  crystal: decodeSourceWav(readFileSync(new URL("crystal-rise.wav", sourceRoot))).samples,
};
function measures(data: Float32Array) {
  let peak = 0,
    sum = 0,
    energy = 0;
  for (const sample of data) {
    peak = Math.max(peak, Math.abs(sample));
    sum += sample;
    energy += sample ** 2;
  }
  return { peak, mean: sum / data.length, energy };
}
describe("authored original bank", () => {
  it("covers every family and variation with distinct material layers, finite headroom and faded edges", () => {
    const recipes = bankRecipes();
    expect(new Set(recipes.map((r) => r.kind))).toEqual(new Set(SOUND_KINDS));
    expect(Object.keys(AUDIO_CUES)).toHaveLength(recipes.length);
    for (const recipe of recipes) {
      const data = renderCue(recipe.kind, recipe.details, "warm", 48000, sources);
      const { peak, mean, energy } = measures(data);
      expect(peak).toBeLessThan(0.3);
      expect(energy).toBeGreaterThan(0.01);
      expect(Math.abs(mean)).toBeLessThan(0.0002);
      expect(data[0]).toBe(0);
      expect(data.at(-1)).toBeCloseTo(0, 7);
      expect(AUDIO_CUES[recipe.key]!.duration).toBe(data.length / 48000);
    }
    expect(audioRecipe("draw").layers.filter((l) => l.texture === "paper")).toHaveLength(2);
    expect(audioRecipe("draw").duration).toBeLessThan(0.2);
    expect(renderCue("draw", {}, "warm", 48000, sources)).not.toEqual(renderCue("draw"));
    expect(audioRecipe("attackDeclare").layers.map((l) => l.texture)).toContain("air");
    expect(audioRecipe("impact").layers.map((l) => l.texture)).toEqual(["body", "grain", "recording"]);
    expect(audioRecipe("securityHit").layers.map((l) => l.texture)).toContain("glass");
    expect(audioRecipe("delete").duration).toBeGreaterThan(audioRecipe("impact").duration);
  });
  it("compares identical original materials and exact runtime slices without raising peak or energy", () => {
    const root = new URL("../../public/audio/", import.meta.url);
    const comparison = JSON.parse(readFileSync(new URL("previews/cue-comparison.json", root), "utf8"));
    expect(comparison.examples).toHaveLength(13);
    expect(comparison.current.url).toBe(AUDIO_BANK_URL);
    for (const version of ["previous", "current"]) {
      const row = comparison[version];
      const wav = readFileSync(new URL(row.url.split("?")[0].slice(7), root));
      expect(createHash("sha256").update(wav).digest("hex")).toBe(row.sha256);
      for (const example of comparison.examples) {
        const clip = example[version];
        const start = 44 + Math.round(clip.offset * 48000) * 2;
        const end = start + Math.round(clip.duration * 48000) * 2;
        expect(wav.readInt16LE(start)).toBe(0);
        expect(wav.readInt16LE(end - 2)).toBe(0);
        expect(end).toBeLessThanOrEqual(wav.length);
      }
    }
    const priorWav = readFileSync(new URL(comparison.previous.url.split("?")[0].slice(7), root));
    for (const example of comparison.examples) {
      const clip = example.previous;
      const single = readFileSync(new URL(clip.url.split("?")[0].slice(7), root));
      const start = 44 + Math.round(clip.offset * 48000) * 2;
      const end = start + Math.round(clip.duration * 48000) * 2;
      expect(createHash("sha256").update(single).digest("hex")).toBe(clip.sha256);
      expect(single.subarray(44)).toEqual(priorWav.subarray(start, end));
      expect(example.current.offset).toBe(AUDIO_CUES[example.key]!.offset);
      expect(example.current.duration).toBe(AUDIO_CUES[example.key]!.duration);
      expect(example.current.duration).toBeLessThan(example.previous.duration);
      expect(example.current.metrics.peak).toBeLessThanOrEqual(example.previous.metrics.peak);
      const energy = (entry: { duration: number; metrics: { rms: number } }) => entry.metrics.rms ** 2 * entry.duration;
      expect(energy(example.current)).toBeLessThan(energy(example.previous));
    }
  });
  it("weights actual printed cost and retains Assembly and physical level jump recipes", () => {
    const light = audioRecipe("cardPlay", { cost: 2 }).layers.find((l) => l.texture === "body")!;
    const heavy = audioRecipe("cardPlay", { cost: 14 }).layers.find((l) => l.texture === "body")!;
    expect(heavy.hz).toBeLessThan(light.hz);
    expect(heavy.gain).toBeGreaterThan(light.gain);
    expect(heavy.duration).toBeGreaterThan(light.duration);
    expect(audioRecipe("cardPlay", { assembly: true }).layers.some((l) => l.texture === "glass")).toBe(true);
    expect(renderCue("digivolve", { sourceLevel: 3, targetLevel: 6 })).not.toEqual(
      renderCue("digivolve", { sourceLevel: 5, targetLevel: 6 }),
    );
    expect(cueKey("digivolve", { sourceLevel: NaN, targetLevel: Infinity })).toBe("digivolve-3-4");
    expect(cueKey("cardPlay", { cost: Infinity })).toBe("cardPlay-5-plain");
    expect(audioRecipe("effectActivate", {}, "crisp").duration).toBeLessThan(audioRecipe("effectActivate").duration);
  });
  it("reproduces seeded output at 44.1 and 48 kHz and proves shipped WAVs use this exact renderer", () => {
    expect(renderCue("draw", {}, "warm", 44100)).toEqual(renderCue("draw", {}, "warm", 44100));
    const root = new URL("../../public/audio/", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
    const source = readFileSync(new URL("audioRecipes.ts", import.meta.url));
    expect(manifest.rendererSha256).toBe(createHash("sha256").update(source).digest("hex"));
    const score = renderMusic();
    const scoreWav = readFileSync(new URL("aegis-music-v2.wav", root));
    for (let i = 0; i < score.length; i += 313)
      expect(scoreWav.readInt16LE(44 + i * 2)).toBe(Math.round(score[i]! * 32767) || 0);
    const wav = readFileSync(new URL("aegis-cues-v2.wav", root));
    for (const [kind, details] of [
      ["draw", {}],
      ["cardPlay", { cost: 12 }],
      ["digivolve", { sourceLevel: 3, targetLevel: 6 }],
    ] as const) {
      const samples = renderCue(kind, details, "warm", 48000, sources);
      const offset = Math.round(AUDIO_CUES[cueKey(kind, details)]!.offset * 48000);
      for (let i = 0; i < samples.length; i += 31)
        expect(wav.readInt16LE(44 + (offset + i) * 2)).toBe(Math.round(samples[i]! * 32767) || 0);
    }
  });
  it("keeps an 96 BPM pulse and progressing melody present from the beginning with a quiet circular seam", () => {
    expect(MUSIC_BPM).toBe(96);
    const layers = musicRecipe();
    expect(
      layers.some((layer) => layer.texture === "paper" || layer.texture === "grain" || layer.texture === "air"),
    ).toBe(false);
    expect(layers.filter((layer) => layer.texture === "body").map((layer) => layer.at)).toEqual(
      Array.from({ length: 32 }, (_, i) => i * 0.625),
    );
    expect(layers.some((layer) => layer.texture === "pluck" && layer.at < 0.25)).toBe(true);
    for (const rate of [44100, 48000]) {
      const music = renderMusic(rate),
        measured = measures(music);
      expect(music.length).toBe(rate * 20);
      expect(measured.peak).toBeLessThan(0.08);
      expect(measured.energy).toBeGreaterThan(1);
      expect(Math.abs(measured.mean)).toBeLessThan(0.00001);
      expect(Math.abs(music[0]! - music.at(-1)!)).toBeLessThan(0.001);
      expect(music.slice(rate, rate * 2)).not.toEqual(music.slice(rate * 9, rate * 10));
    }
  });
});
