import manifest from "../../public/audio/music/manifest.json";

// Keep the first three storage identities so existing preferences select their replacements.
export const MUSIC_TRACKS = ["digitalBattle", "digitalAscent", "warmDrive", "cipher"] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];
export const DEFAULT_MUSIC_TRACK: MusicTrack = "digitalBattle";
export const MUSIC_TRACK_CREDITS = manifest.tracks;

export const MUSIC_TRACK_URLS: Record<MusicTrack, string> = {
  digitalBattle: manifest.tracks.digitalBattle.url,
  digitalAscent: manifest.tracks.digitalAscent.url,
  warmDrive: manifest.tracks.warmDrive.url,
  cipher: manifest.tracks.cipher.url,
};
export const MUSIC_URL = MUSIC_TRACK_URLS[DEFAULT_MUSIC_TRACK];

export const isMusicTrack = (value: unknown): value is MusicTrack =>
  typeof value === "string" && (MUSIC_TRACKS as readonly string[]).includes(value);

export const MUSIC_TRACK_LABEL_KEYS = {
  digitalBattle: "settings.musicTrackShortcuts",
  digitalAscent: "settings.musicTrackElectric",
  warmDrive: "settings.musicTrackOutThere",
  cipher: "settings.musicTrackCipher",
} as const satisfies Record<MusicTrack, string>;
