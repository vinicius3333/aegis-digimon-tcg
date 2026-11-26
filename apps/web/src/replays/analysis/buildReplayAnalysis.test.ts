import { describe, expect, it } from "vitest";
import type { MatchReplay } from "@aegis/shared/replays";
import { buildReplayAnalysis } from "@/replays/analysis/buildReplayAnalysis";

type Side = { security?: number; board?: number; hand?: number; trash?: number; deck?: number };
type Frame = { turn: number; seat?: number; memory?: number; sides?: [Side, Side] };

function createReplay(frames: Frame[], winnerSeat = 0): MatchReplay {
  return {
    winnerSeat,
    frames: frames.map(({ turn, seat = 0, memory = 0, sides = [{}, {}] }, index) => ({
      atMs: index * 1000,
      events: [],
      state: {
        turnCount: turn,
        turnSeat: seat,
        memory,
        players: sides.map(({ security = 5, board = 0, hand = 5, trash = 0, deck = 30 }) => ({
          securityCount: security,
          battleArea: Array.from({ length: board }),
          handCount: hand,
          trash: Array.from({ length: trash }),
          deckCount: deck,
        })),
      },
    })),
  } as unknown as MatchReplay;
}

describe("replay analysis", () => {
  it("measures swings in win-chance points when the file carries the bot estimate", () => {
    const replay = createReplay([{ turn: 0 }, { turn: 1 }, { turn: 1 }, { turn: 2, seat: 1 }, { turn: 2, seat: 1 }]);
    replay.advantage = [0.5, 0.52, 0.81, 0.76, 0.7];

    const analysis = buildReplayAnalysis({ replay });

    expect(analysis.source).toBe("bot");
    expect(analysis.series.map((value) => Math.round(value * 100) / 100)).toEqual([0.5, 0.52, 0.81, 0.76, 0.7]);
    expect(analysis.turns.map(({ swing, turningPoint, peakIndex }) => ({ swing, turningPoint, peakIndex }))).toEqual([
      { swing: 31, turningPoint: true, peakIndex: 2 },
      { swing: -11, turningPoint: false, peakIndex: 4 },
    ]);
    expect(analysis.keyMoments.map((moment) => moment.turn)).toEqual([1]);
  });

  it("falls back to the board lead when the bot estimate does not match the frames", () => {
    const replay = createReplay([{ turn: 1 }, { turn: 1, sides: [{ board: 2 }, {}] }]);
    replay.advantage = [0.5];

    expect(buildReplayAnalysis({ replay }).source).toBe("heuristic");
  });

  it("reads each turn's counts from its last frame, with memory from each player's side", () => {
    const replay = createReplay([
      { turn: 0 },
      { turn: 1, memory: 3 },
      { turn: 1, memory: -2, sides: [{ board: 1, hand: 4, deck: 29 }, {}] },
      { turn: 2, seat: 1, memory: 2, sides: [{ board: 1, hand: 4, deck: 29 }, { trash: 1 }] },
    ]);

    const { turns } = buildReplayAnalysis({ replay });

    expect(turns.map(({ turn, seat, startIndex, endIndex }) => ({ turn, seat, startIndex, endIndex }))).toEqual([
      { turn: 1, seat: 0, startIndex: 1, endIndex: 2 },
      { turn: 2, seat: 1, startIndex: 3, endIndex: 3 },
    ]);
    expect(turns[0]!.players).toEqual([
      { memory: -2, security: 5, board: 1, hand: 4, trash: 0, deck: 29 },
      { memory: 2, security: 5, board: 0, hand: 5, trash: 0, deck: 30 },
    ]);
    expect(turns[0]!.changes[0]).toEqual({ memory: -2, security: 0, board: 1, hand: -1, trash: 0, deck: -1 });
    expect(turns[1]!.players[1].memory).toBe(2);
  });

  it("flags a turn that moves the lead by six or more and points at its biggest step", () => {
    const replay = createReplay([
      { turn: 1 },
      { turn: 1, sides: [{ board: 1, hand: 4 }, {}] },
      { turn: 1, sides: [{ board: 1, hand: 4 }, { security: 3 }] },
      {
        turn: 2,
        seat: 1,
        sides: [
          { board: 1, hand: 4 },
          { security: 3, hand: 6 },
        ],
      },
    ]);

    const { turns } = buildReplayAnalysis({ replay });

    expect(turns[0]).toMatchObject({ swing: 7, turningPoint: true, peakIndex: 2 });
    expect(turns[1]).toMatchObject({ swing: -1, turningPoint: false });
  });

  it("ranks at most three turns that helped the winner and ignores swings toward the loser", () => {
    const security = [5, 4, 4, 2, 2, 1, 1, 0];
    const frames: Frame[] = [{ turn: 0 }];
    security.forEach((value, index) =>
      frames.push({
        turn: index + 1,
        seat: index % 2,
        sides: [{ hand: index % 2 === 1 ? 9 : 5 }, { security: value }],
      }),
    );

    const { keyMoments } = buildReplayAnalysis({ replay: createReplay(frames, 0) });

    expect(keyMoments.map((moment) => moment.turn)).toEqual([4, 2, 6]);
    expect(keyMoments.every((moment) => moment.swing > 0)).toBe(true);
    expect(
      buildReplayAnalysis({ replay: createReplay(frames, 1) }).keyMoments.every((moment) => moment.swing < 0),
    ).toBe(true);
  });
});
