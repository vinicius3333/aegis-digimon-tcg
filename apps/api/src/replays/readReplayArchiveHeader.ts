import { gunzipSync } from "node:zlib";
import { FULL_FRAME_REPLAY_VERSION, MAX_REPLAY_BYTES, REPLAY_FORMAT_VERSION } from "@aegis/shared/replays";

export type ReplayArchiveHeader = { id?: string; viewerSeat?: number };

export function readReplayArchiveHeader(archive: Buffer): ReplayArchiveHeader | undefined {
  if (archive.length === 0 || archive.length > MAX_REPLAY_BYTES || archive[0] !== 0x1f || archive[1] !== 0x8b) {
    return undefined;
  }
  let parsed: { format?: string; version?: number; id?: string; viewerSeat?: number } | null;
  try {
    parsed = JSON.parse(gunzipSync(archive, { maxOutputLength: MAX_REPLAY_BYTES }).toString());
  } catch {
    return undefined;
  }
  if (
    !parsed ||
    parsed.format !== "aegis-replay" ||
    (parsed.version !== REPLAY_FORMAT_VERSION && parsed.version !== FULL_FRAME_REPLAY_VERSION)
  ) {
    return undefined;
  }
  return { id: parsed.id, viewerSeat: parsed.viewerSeat };
}
