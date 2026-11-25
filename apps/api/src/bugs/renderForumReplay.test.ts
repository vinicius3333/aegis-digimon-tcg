import { gunzipSync } from "node:zlib";
import type { MatchReplay } from "@aegis/shared";
import { decodeReplayFrames } from "@aegis/shared/replays/decodeReplayFrames";
import { describe, expect, it } from "vitest";
import { renderForumReplay } from "#api/bugs/renderForumReplay";
import { extractReplay } from "#api/replays/inputs/extract";
import { recordRoomMatch } from "#api/replays/inputs/roomMatch.fixture";
import type { ReplayRecord } from "#api/replays/inputs/types";

describe("renderForumReplay", () => {
  it("turns a report's input record into a spectator replay with no hands, decks, names or match ID", async () => {
    const recorded = await recordRoomMatch({ seed: 20260914 });
    const record = JSON.parse(JSON.stringify(extractReplay(recorded.lines, recorded.matchId))) as ReplayRecord;

    const file = JSON.parse(gunzipSync(await renderForumReplay(record)).toString("utf8")) as MatchReplay;
    const replay = { ...file, frames: decodeReplayFrames(file.frames) };

    expect(replay.format).toBe("aegis-replay");
    expect(replay.frames.length).toBeGreaterThan(1);
    expect(replay.viewerSeat).toBe(-1);
    expect(replay.visibleHandSeats).toEqual([]);
    expect(replay.decks).toBeUndefined();
    expect(replay.players).toEqual(["Player 1", "Player 2"]);
    for (const frame of replay.frames) {
      expect(frame.state.matchLogId).toBe("");
      expect(frame.state.players.every((player) => player.hand.length === 0)).toBe(true);
    }
    expect(JSON.stringify(file)).not.toContain(recorded.matchId);
  }, 180_000);
});
