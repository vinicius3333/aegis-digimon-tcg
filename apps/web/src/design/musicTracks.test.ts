import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../public/audio/music/manifest.json";
import { MUSIC_URL as BANK_MUSIC_URL } from "./audioBank";
import { DEFAULT_MUSIC_TRACK, MUSIC_TRACKS, MUSIC_TRACK_URLS, MUSIC_URL } from "./musicTracks";

describe("licensed full-length soundtrack", () => {
  it("ships local, hashed compositions with source provenance, licenses and safe mastered levels", () => {
    for (const id of MUSIC_TRACKS) {
      const track = manifest.tracks[id];
      const bytes = readFileSync(new URL(`../../public/audio/music/${track.file}`, import.meta.url));
      const hash = createHash("sha256").update(bytes).digest("hex");
      expect(hash).toBe(track.sha256);
      expect(bytes.length).toBe(track.bytes);
      expect(MUSIC_TRACK_URLS[id]).toBe(`/audio/music/${track.file}?v=${hash.slice(0, 12)}`);
      expect(track.sourceUrl).toMatch(/^https:\/\//);
      expect(track.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(["CC0", "CC BY 4.0"]).toContain(track.license);
      expect(track.licenseUrl).toMatch(/^https:\/\/creativecommons.org\//);
      expect(track.modifications).toContain("Volume adjusted");
      expect(track.metrics.seconds).toBeGreaterThan(180);
      expect(Math.abs(track.metrics.seconds - track.sourceSeconds)).toBeLessThan(0.15);
      expect(track.metrics.peak).toBeLessThan(0.08);
      expect(track.metrics.rms).toBeGreaterThan(0.005);
    }
  });

  it("keeps the soundtrack metadata and exported runtime default in sync", () => {
    const bank = JSON.parse(readFileSync(new URL("../../public/audio/manifest.json", import.meta.url), "utf8"));
    expect(manifest.defaultTrack).toBe(DEFAULT_MUSIC_TRACK);
    expect(manifest.tracks[DEFAULT_MUSIC_TRACK].title).toBe("Shortcuts");
    expect(BANK_MUSIC_URL).toBe(MUSIC_URL);
    expect(bank.music.url).toBe(MUSIC_URL);
    expect(bank.music.sha256).toBe(manifest.tracks[DEFAULT_MUSIC_TRACK].sha256);
    expect(bank.music.originalScore).toBe(false);
  });
});
