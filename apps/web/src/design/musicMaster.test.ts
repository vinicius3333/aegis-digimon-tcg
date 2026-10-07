import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { tempoOriginalMusic } from "../../../../tools/diagnostics/tempo-original-music.mjs";
import { MUSIC_URL } from "./audioBank";
import { MUSIC_TRACK_URLS } from "./musicTracks";
import {
  decodeMusicWav,
  encodeMusicWav,
  masterOriginalMusic,
  musicMetrics,
  addRecordedMusicPulse,
  analyzeMusicBeatPhase,
} from "./musicMaster";

const root = new URL("../../public/audio/", import.meta.url);
const provenance = JSON.parse(
  readFileSync(new URL("music-candidates/provenance.json", root), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(new URL("music-candidates/manifest.json", root), "utf8"),
);
const WARM_DRIVE_ID = `warm-drive-${provenance.driveRecipe.bpm}`;
describe("original musical source mastering", () => {
  it("reproduces exact candidate PCM and selects the same content-hashed waveform for game and harness", () => {
    const runtime = manifest.candidates.find(
      (row: { id: string }) => row.id === manifest.selectedId,
    );
    expect(MUSIC_URL).toBe(runtime.url);
    expect(manifest.runtimeUrl).toBe(runtime.url);
    expect(runtime.role).toBe("selected");
    const selected = manifest.candidates.find(
      (row: { id: string }) => row.id === WARM_DRIVE_ID,
    );
    expect(selected.bpm).toBe(provenance.driveRecipe.bpm);
    expect(selected.role).toBe("alternative");
    expect(selected.finishedAnalysis.sha256).toBe(selected.sha256);
    expect(selected.finishedAnalysis.gridBpm).toBe(provenance.driveRecipe.bpm);
    expect(selected.finishedAnalysis.gridStrength).toBeGreaterThan(1.5);
    for (const candidate of provenance.candidates) {
      const source = gunzipSync(
        readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root)),
      );
      expect(createHash("sha256").update(source).digest("hex")).toBe(
        candidate.sourceSha256,
      );
      const original = masterOriginalMusic(
        decodeMusicWav(source),
        candidate.masterSettings,
      );
      const pcm =
        candidate.id === provenance.selectedId
          ? tempoOriginalMusic(
              original,
              provenance.selectedTempo.fromBpm,
              provenance.selectedTempo.bpm,
            )
          : original;
      const bytes = encodeMusicWav(pcm);
      const row = manifest.candidates.find(
        (entry: { id: string }) => entry.id === candidate.id,
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
      const shipped = readFileSync(new URL(row.file, root));
      expect(createHash("sha256").update(shipped).digest("hex")).toBe(
        row.sha256,
      );
      const measured = musicMetrics(decodeMusicWav(shipped));
      expect(measured.channels).toBe(2);
      expect(measured.peak).toBeLessThan(0.08);
      expect(measured.rms).toBeGreaterThan(0.01);
      expect(Math.abs(measured.dc)).toBeLessThan(0.000001);
      expect(measured.boundaryStep).toBe(0);
      expect(measured.seconds).toBeCloseTo(
        (candidate.masterSettings.beats * 60) / row.bpm,
        4,
      );
      expect(row.sourceIdentity.type).toBe("original-text-generation");
    }
  });
  it("preserves the liked dry 112 BPM score bytes as the warm drive comparison", () => {
    const dry = manifest.candidates.find(
      (row: { id: string }) => row.id === "warm-drive",
    );
    expect(
      createHash("sha256")
        .update(readFileSync(new URL(dry.file, root)))
        .digest("hex"),
    ).toBe("dfc22b914a38fd0c2e681022c3e630288c3fcf0a8f5cf73687bbabd9471a6715");
  });
  it("plays the warm drive track at the faster recipe tempo with an eighth-note recorded pulse", () => {
    const { driveRecipe } = provenance;
    const drive = manifest.candidates.find(
      (row: { id: string }) => row.id === WARM_DRIVE_ID,
    );
    expect(MUSIC_TRACK_URLS.warmDrive).toBe(drive.url);
    const candidate = provenance.candidates.find(
      (row: { id: string }) => row.id === provenance.selectedId,
    );
    const source = decodeMusicWav(
      gunzipSync(
        readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root)),
      ),
    );
    const recorded = (name: string) => {
      const audio = decodeMusicWav(
        readFileSync(new URL(`sources/recorded-${name}.wav`, root)),
      );
      return { sampleRate: audio.sampleRate, samples: audio.channels[0]! };
    };
    const driven = addRecordedMusicPulse(
      tempoOriginalMusic(
        masterOriginalMusic(source, candidate.masterSettings),
        driveRecipe.fromBpm,
        driveRecipe.bpm,
      ),
      recorded("placeHeavy"),
      recorded("tap"),
      driveRecipe,
    );
    const bytes = encodeMusicWav(driven.pcm);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(drive.sha256);
    expect(
      createHash("sha256")
        .update(readFileSync(new URL(drive.file, root)))
        .digest("hex"),
    ).toBe(drive.sha256);
    expect(driveRecipe.bpm).toBeGreaterThanOrEqual(130);
    expect(driven.events).toHaveLength(
      candidate.masterSettings.beats * driveRecipe.stepsPerBeat,
    );
    for (let i = 1; i < driven.events.length; i++)
      expect(
        driven.events[i]!.peakSeconds - driven.events[i - 1]!.peakSeconds,
      ).toBeCloseTo(60 / driveRecipe.bpm / driveRecipe.stepsPerBeat, 3);
    expect(driven.analysis.gridStrength).toBeGreaterThan(1.5);
    const metrics = musicMetrics(driven.pcm);
    expect(metrics.peak).toBeLessThan(0.079);
    expect(metrics.boundaryStep).toBeLessThan(0.000001);
    expect(metrics.seconds).toBeCloseTo(
      (candidate.masterSettings.beats * 60) / driveRecipe.bpm,
      4,
    );
  });
  it("detects a deliberately offset recorded beat instead of assuming phase zero", () => {
    const rate = 48000,
      data = new Float32Array(rate * 8),
      offset = 0.16;
    for (let beat = 0; beat < 12; beat++) {
      const start = Math.round((offset + (beat * 60) / 112) * rate);
      for (let i = 0; i < rate * 0.07; i++)
        data[start + i] =
          Math.sin((2 * Math.PI * 90 * i) / rate) *
          Math.exp(-i / (rate * 0.014)) *
          0.05;
    }
    const analysis = analyzeMusicBeatPhase({
      sampleRate: rate,
      channels: [data],
    });
    expect(analysis.phaseSeconds).toBeCloseTo(offset, 1);
    expect(analysis.phaseSeconds).toBeGreaterThan(0.1);
  });
  it("retains rhythmic energy across the circular boundary rather than inserting a silence gap", () => {
    const selected = manifest.candidates.find(
      (row: { id: string }) => row.id === WARM_DRIVE_ID,
    );
    const pcm = decodeMusicWav(readFileSync(new URL(selected.file, root)));
    const frames = Math.round(pcm.sampleRate * 0.12);
    const rms = (data: Float32Array) =>
      Math.sqrt(
        data.reduce((sum, sample) => sum + sample * sample, 0) / data.length,
      );
    for (const channel of pcm.channels) {
      expect(rms(channel.slice(0, frames))).toBeGreaterThan(0.004);
      expect(rms(channel.slice(-frames))).toBeGreaterThan(0.004);
    }
    expect(selected.sourceAnalysis.boundaryChromaCosine).toBeGreaterThan(0.9);
    expect(selected.sourceAnalysis.tempoConfidence).toBeGreaterThan(0.6);
  });
  it("supports deterministic 44.1 kHz mastering from the same committed original source", () => {
    const candidate = provenance.candidates[0];
    const source = decodeMusicWav(
      gunzipSync(
        readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root)),
      ),
    );
    const pcm = masterOriginalMusic(source, candidate.masterSettings, 44100);
    expect(pcm.sampleRate).toBe(44100);
    const metrics = musicMetrics(pcm);
    expect(metrics.peak).toBeCloseTo(0.075, 6);
    expect(metrics.boundaryStep).toBeLessThan(0.000001);
  });
  it("increases offline pace without shifting a known instrument pitch", () => {
    const rate = 48000;
    const tone = Float32Array.from(
      { length: rate * 2 },
      (_, i) => Math.sin((2 * Math.PI * 440 * i) / rate) * 0.05,
    );
    const pcm = tempoOriginalMusic(
      { sampleRate: rate, channels: [tone] },
      104,
      112,
    );
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
    const source = decodeMusicWav(
      gunzipSync(
        readFileSync(new URL(`music-candidates/${candidate.sourceFile}`, root)),
      ),
    );
    expect(() =>
      masterOriginalMusic(source, {
        ...candidate.masterSettings,
        startSeconds: 0,
      }),
    ).toThrow(/pre-roll/);
    expect(() =>
      masterOriginalMusic(source, { ...candidate.masterSettings, beats: 128 }),
    ).toThrow(/phrase/);
    expect(() =>
      masterOriginalMusic(source, { ...candidate.masterSettings, peak: 1 }),
    ).toThrow(/settings/);
    expect(() =>
      masterOriginalMusic(source, {
        ...candidate.masterSettings,
        sourceBpm: NaN,
      }),
    ).toThrow(/settings/);
  });
});
