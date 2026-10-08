import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { MatchReplay } from "@aegis/shared";
import { createPlaybackClock, presentationEnd } from "../../src/replays/playback";
import { REPLAY_RECORDINGS } from "./recordings";
import { replayFixture, securityReplayFixture } from "./fixture";

describe("replay presentation boundaries", () => {
  it("delivers the check and attack resolution before waiting for their presentation", () => {
    const replay = securityReplayFixture();
    expect(presentationEnd(replay, 1)).toBe(2);
    expect(presentationEnd(replay, 3)).toBe(3);
  });
  it("does not close an active effect when the same source reports an unrelated no-effect trigger", () => {
    const replay = replayFixture();
    const source = {
      seat: 0 as const,
      sourceCardId: "BT1-010",
      sourceInstanceId: "same-card",
      effectKey: "same-clause",
      description: "Draw 1",
    };
    replay.frames[1]!.events = [{ ...source, kind: "effectTriggered", seq: 2, batch: "begin", stateVersion: 2 }];
    replay.frames[2]!.events = [{ ...source, kind: "effectHadNoEffect", seq: 3, batch: "nothing", stateVersion: 3 }];
    replay.frames[3]!.events = [{ ...source, kind: "effectResolved", seq: 4, batch: "end", stateVersion: 4 }];
    expect(presentationEnd(replay, 1)).toBe(3);
  });
  for (const id of REPLAY_RECORDINGS) {
    it(`keeps every triggered effect and security dependency together in ${id}`, () => {
      const replay: MatchReplay = JSON.parse(
        gunzipSync(readFileSync(`test/replays/recordings/${id}.aegis-replay`)).toString(),
      );
      let start = 1;
      let groups = 0;
      while (start < replay.frames.length) {
        const end = presentationEnd(replay, start);
        expect(end).toBeGreaterThanOrEqual(start);
        expect(end).toBeLessThan(replay.frames.length);
        const events = replay.frames.slice(start, end + 1).flatMap((frame) => frame.events);
        // A triggered effect can span multiple closed batches, including nested triggers.
        for (const trigger of events.filter((event) => event.kind === "effectTriggered")) {
          expect(
            events.some(
              (event) =>
                (event.kind === "effectResolved" || event.kind === "effectHadNoEffect") &&
                event.seat === trigger.seat &&
                event.effectKey === trigger.effectKey,
            ),
          ).toBe(true);
        }
        start = end + 1;
        groups++;
      }
      expect(groups).toBeGreaterThan(1);
      const hasDependencies = replay.frames.some((frame) =>
        frame.events.some((event) => event.kind === "effectTriggered" || event.kind === "attackDeclared"),
      );
      expect(groups).toBeLessThan(replay.frames.length - (hasDependencies ? 1 : 0));
    });
  }
});

describe("replay pacing clock", () => {
  it("keeps elapsed progress through pauses and speed changes without counting paused time", () => {
    let now = 0;
    const clock = createPlaybackClock(() => now);
    clock.configure(1, true);
    now = 400;
    clock.configure(4, true);
    now = 500;
    expect(clock.elapsed()).toBe(800);
    clock.configure(4, false);
    now = 1500;
    expect(clock.elapsed()).toBe(800);
    clock.configure(0.5, true);
    now = 1900;
    expect(clock.elapsed()).toBe(1000);
    clock.reset();
    now = 2100;
    expect(clock.elapsed()).toBe(100);
  });
});
