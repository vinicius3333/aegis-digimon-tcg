import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { tempoOriginalMusic } from "../../../../tools/diagnostics/tempo-original-music.mjs";
import { MUSIC_URL } from "./audioBank";
import { decodeMusicWav, encodeMusicWav, masterOriginalMusic, musicMetrics } from "./musicMaster";

const root = new URL("../../public/audio/", import.meta.url);
const provenance = JSON.parse(readFileSync(new URL("music-candidates/provenance.json", root), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("music-candidates/manifest.json", root), "utf8"));
describe("original musical source mastering", () => {
  it("reproduces exact candidate PCM and selects the same content-hashed waveform for game and harness", () => {
    const selected = manifest.candidates.find((row: { id: string }) => row.id === manifest.selectedId);
    expect(MUSIC_URL).toBe(selected.url);
    expect(manifest.runtimeUrl).toBe(selected.url);
    expect(selected.bpm).toBe(112);
    expect(selected.role).toBe("selected");
    expect(selected.finishedAnalysis.sha256).toBe(selected.sha256);
    expect(selected.finishedAnalysis.estimatedBpm).toBeCloseTo(112, 0);
    expect(selected.finishedAnalysis.normalizedAutocorrelation).toBeGreaterThan(0.6);
    for (const candidate of provenance.candidates) {
      const source = gunzipSync(readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root)));
      expect(createHash("sha256").update(source).digest("hex")).toBe(candidate.sourceSha256);
      const original = masterOriginalMusic(decodeMusicWav(source), candidate.masterSettings);
      const pcm =
        candidate.id === provenance.selectedId
          ? tempoOriginalMusic(original, provenance.selectedTempo.fromBpm, provenance.selectedTempo.bpm)
          : original;
      const bytes = encodeMusicWav(pcm);
      const row = manifest.candidates.find((entry: { id: string }) => entry.id === candidate.id);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
      const shipped = readFileSync(new URL(row.file, root));
      expect(createHash("sha256").update(shipped).digest("hex")).toBe(row.sha256);
      const measured = musicMetrics(decodeMusicWav(shipped));
      expect(measured.channels).toBe(2);
      expect(measured.peak).toBeLessThan(0.08);
      expect(measured.rms).toBeGreaterThan(0.01);
      expect(Math.abs(measured.dc)).toBeLessThan(0.000001);
      expect(measured.boundaryStep).toBe(0);
      expect(measured.seconds).toBeCloseTo((candidate.masterSettings.beats * 60) / row.bpm, 4);
      expect(row.sourceIdentity.type).toBe("original-text-generation");
    }
  });
  it("retains rhythmic energy across the circular boundary rather than inserting a silence gap", () => {
    const selected = manifest.candidates.find((row: { id: string }) => row.id === manifest.selectedId);
    const pcm = decodeMusicWav(readFileSync(new URL(selected.file, root)));
    const frames = Math.round(pcm.sampleRate * 0.12);
    const rms = (data: Float32Array) => Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
    for (const channel of pcm.channels) {
      expect(rms(channel.slice(0, frames))).toBeGreaterThan(0.004);
      expect(rms(channel.slice(-frames))).toBeGreaterThan(0.004);
    }
    expect(selected.sourceAnalysis.boundaryChromaCosine).toBeGreaterThan(0.9);
    expect(selected.sourceAnalysis.tempoConfidence).toBeGreaterThan(0.6);
  });
  it("supports deterministic 44.1 kHz mastering from the same committed original source", () => {
    const candidate = provenance.candidates[0];
    const source = decodeMusicWav(gunzipSync(readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root))));
    const pcm = masterOriginalMusic(source, candidate.masterSettings, 44100);
    expect(pcm.sampleRate).toBe(44100);
    const metrics = musicMetrics(pcm);
    expect(metrics.peak).toBeCloseTo(0.075, 6);
    expect(metrics.boundaryStep).toBeLessThan(0.000001);
  });
  it("increases offline pace without shifting a known instrument pitch", () => {
    const rate = 48000;
    const tone = Float32Array.from({ length: rate * 2 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / rate) * 0.05);
    const pcm = tempoOriginalMusic({ sampleRate: rate, channels: [tone] }, 104, 112);
    expect(pcm.channels[0]!.length).toBe(Math.round((tone.length * 104) / 112));
    const data = pcm.channels[0]!.slice(rate / 4, (rate * 3) / 4);
    const amplitude = (hz: number) => {
      let real = 0,
        imaginary = 0;
      for (let i = 0; i < data.length; i++) {
        const phase = (2 * Math.PI * hz * i) / rate;
        real += data[i]! * Math.cos(phase);
        imaginary += data[i]! * Math.sin(phase);
      }
      return Math.hypot(real, imaginary) / data.length;
    };
    expect(amplitude(440)).toBeGreaterThan(0.025);
    expect(amplitude((440 * 112) / 104)).toBeLessThan(amplitude(440) * 0.03);
    expect(musicMetrics(pcm).boundaryStep).toBeLessThan(0.000001);
  });
  it("rejects incomplete phrases, missing pre-roll and unsafe headroom without yielding a broken loop", () => {
    const candidate = provenance.candidates[0];
    const source = decodeMusicWav(gunzipSync(readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root))));
    expect(() => masterOriginalMusic(source, { ...candidate.masterSettings, startSeconds: 0 })).toThrow(/pre-roll/);
    expect(() => masterOriginalMusic(source, { ...candidate.masterSettings, beats: 128 })).toThrow(/phrase/);
    expect(() => masterOriginalMusic(source, { ...candidate.masterSettings, peak: 1 })).toThrow(/settings/);
    expect(() => masterOriginalMusic(source, { ...candidate.masterSettings, sourceBpm: NaN })).toThrow(/settings/);
  });
});
