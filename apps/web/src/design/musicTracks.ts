import { MUSIC_URL } from "./audioBank";

export const MUSIC_TRACKS = ["digitalBattle", "digitalAscent", "warmDrive"] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];
export const DEFAULT_MUSIC_TRACK: MusicTrack = "digitalBattle";

// The alternatives are the approved `alternativeIds` in public/audio/manifest.json, mastered to the same level.
export const MUSIC_TRACK_URLS: Record<MusicTrack, string> = {
  digitalBattle: MUSIC_URL,
  digitalAscent: "/audio/aegis-music-v4.wav?v=c38aec12797c",
  warmDrive: "/audio/aegis-music-v6.wav?v=28250706a1df",
};

export const isMusicTrack = (value: unknown): value is MusicTrack =>
  typeof value === "string" && (MUSIC_TRACKS as readonly string[]).includes(value);

export const MUSIC_TRACK_LABEL_KEYS = {
  digitalBattle: "settings.musicTrackDigitalBattle",
  digitalAscent: "settings.musicTrackDigitalAscent",
  warmDrive: "settings.musicTrackWarmDrive",
} as const satisfies Record<MusicTrack, string>;
