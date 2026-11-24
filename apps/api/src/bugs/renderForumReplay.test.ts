import { gunzipSync } from "node:zlib";
import type { MatchReplay } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { renderForumReplay } from "#api/bugs/renderForumReplay";
import { extractReplay } from "#api/replays/inputs/extract";
import { recordRoomMatch } from "#api/replays/inputs/roomMatch.fixture";
import type { ReplayRecord } from "#api/replays/inputs/types";

describe("renderForumReplay", () => {
  it("turns a report's input record into a replay file the viewer opens, off the main thread", async () => {
    const recorded = await recordRoomMatch({ seed: 20260914 });
    const record = JSON.parse(JSON.stringify(extractReplay(recorded.lines, recorded.matchId))) as ReplayRecord;

    const replay = JSON.parse(gunzipSync(await renderForumReplay(record)).toString("utf8")) as MatchReplay;

    expect(replay.format).toBe("aegis-replay");
    expect(replay.frames.length).toBeGreaterThan(1);
  }, 180_000);
});
