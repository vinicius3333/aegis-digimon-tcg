import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { MAX_REPLAY_BYTES } from "@aegis/shared";
import { replayFixture } from "./fixture";
import { readReplay } from "../../src/replays/files";
import { frameDelay, playbackState, turnPositions } from "../../src/replays/playback";

describe("portable replay files", () => {
  it("opens actual server snapshots as JSON or gzip without a server", async () => {
    const replay = replayFixture();
    const text = JSON.stringify(replay);
    for (const file of [new Blob([text]), new Blob([gzipSync(text)])]) {
      expect(await readReplay(file)).toEqual(JSON.parse(text));
    }
  });
  it("rejects unsupported versions, corrupt archives, incomplete states, invalid event shapes and empty files", async () => {
    await expect(readReplay(new Blob())).rejects.toMatchObject({ code: "size" });
    await expect(readReplay(new Blob([new Uint8Array([31, 139, 99, 99])]))).rejects.toMatchObject({ code: "invalid" });
    await expect(readReplay(new Blob(['{"format":"aegis-replay","version":999}']))).rejects.toMatchObject({
      code: "version",
    });
    for (const mutate of [
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames.at(-1)!.state.gameOver = false;
      },
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames[0]!.state.players[0]!.battleArea = null as never;
      },
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames[0]!.events[0]!.kind = "toString" as never;
      },
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames[1]!.atMs = -1;
      },
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames[0]!.events[0] = { kind: "attackDeclared", seq: 1, batch: "batch-0", stateVersion: 1 } as never;
      },
      (replay: ReturnType<typeof replayFixture>) => {
        replay.frames[0]!.state.series = {} as never;
      },
    ]) {
      const replay = replayFixture();
      mutate(replay);
      await expect(readReplay(new Blob([JSON.stringify(replay)]))).rejects.toMatchObject({ code: "invalid" });
    }
  });
  it("limits gzip expansion so a small compressed file cannot allocate unlimited memory", async () => {
    const bomb = gzipSync(" ".repeat(MAX_REPLAY_BYTES + 1));
    await expect(readReplay(new Blob([bomb]))).rejects.toMatchObject({ code: "size" });
  });
  it("seeks across turn changes and hides a hand without mutating the recording", () => {
    const replay = replayFixture();
    expect(turnPositions(replay)).toEqual([
      { index: 0, turn: 1, seat: 0 },
      { index: 2, turn: 2, seat: 1 },
    ]);
    expect(playbackState(replay, 0, false).players[0]!.hand).toEqual([]);
    expect(replay.frames[0]!.state.players[0]!.hand).toHaveLength(1);
    expect(frameDelay(replay, 0, 2)).toBe(500);
    replay.frames[1]!.atMs = 60_000;
    expect(frameDelay(replay, 0, 1)).toBe(2500);
  });
});
