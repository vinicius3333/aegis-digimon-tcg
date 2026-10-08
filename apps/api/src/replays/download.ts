import { promisify } from "node:util";
import { gzip } from "node:zlib";
import type { MatchReplay, ReplayDownloadMessage, Seat } from "@aegis/shared";
import { projectReplay } from "./recording.js";

const compress = promisify(gzip);

/** Export a copy so filtering one seat can never affect the other seat's file. */
export async function replayDownload(recording: MatchReplay, seat: Seat): Promise<ReplayDownloadMessage> {
  const replay = projectReplay(structuredClone(recording), seat);
  const {
    frames: _frames,
    visibleHandSeats: _hands,
    viewerSeat: _seat,
    format: _format,
    version: _version,
    ...summary
  } = replay;
  return {
    kind: "ready",
    summary,
    viewerSeat: seat,
    data: (await compress(JSON.stringify(replay))).toString("base64"),
  };
}
