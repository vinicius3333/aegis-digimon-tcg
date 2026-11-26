import { describe, expect, it } from "vitest";
import type { MatchReplay } from "@aegis/shared/replays";
import type { ServerEvent } from "@aegis/shared/protocol/events";
import { buildReplayPlayerReports } from "@/replays/analysis/buildReplayPlayerReports";

type Card = [instanceId: string, cardId: string];
type Frame = {
  turn: number;
  seat?: number;
  hands?: [Card[], Card[]];
  boards?: [string[], string[]];
  events?: ServerEvent[];
};

function createReplay(frames: Frame[]): MatchReplay {
  return {
    frames: frames.map(({ turn, seat = 0, hands = [[], []], boards = [[], []], events = [] }, index) => ({
      atMs: index * 1000,
      events,
      state: {
        turnCount: turn,
        turnSeat: seat,
        players: hands.map((hand, owner) => ({
          hand: hand.map(([instanceId, cardId]) => ({ instanceId, cardId })),
          battleArea: boards[owner]!.map((permanentId) => ({ permanentId })),
        })),
      },
    })),
  } as unknown as MatchReplay;
}

const opening: Card[] = [
  ["a", "BT1-001"],
  ["b", "BT1-002"],
];
const redrawn: Card[] = [
  ["c", "BT1-003"],
  ["d", "BT1-004"],
];

describe("replay player reports", () => {
  it("shows the opening hand and whether each player kept it or redrew", () => {
    const replay = createReplay([
      { turn: 0, hands: [opening, opening] },
      { turn: 0, hands: [opening, redrawn] },
      { turn: 1, hands: [opening, redrawn] },
    ]);

    const [first, second] = buildReplayPlayerReports({ replay });

    expect(first).toMatchObject({ openingHand: ["BT1-001", "BT1-002"], redrew: false });
    expect(second).toMatchObject({
      openingHand: ["BT1-001", "BT1-002"],
      startingHand: ["BT1-003", "BT1-004"],
      redrew: true,
    });
  });

  it("lists each turn's draws, including hidden draws matched to the new hand card", () => {
    const replay = createReplay([
      { turn: 1, hands: [opening, []] },
      {
        turn: 1,
        hands: [[...opening, ["x", "BT2-010"]], []],
        events: [
          { kind: "cardsMoved", instanceIds: ["hidden-0"], from: "deck", to: "hand", seat: 0, handAddition: "draw" },
        ],
      },
      {
        turn: 1,
        hands: [[...opening, ["x", "BT2-010"], ["y", "BT2-011"]], []],
        events: [
          {
            kind: "cardsMoved",
            instanceIds: ["y"],
            from: "deck",
            to: "hand",
            seat: 0,
            handAddition: "transfer",
          },
        ],
      },
    ]);

    expect(buildReplayPlayerReports({ replay })[0].draws).toEqual([
      {
        turn: 1,
        frameIndex: 1,
        cards: [
          { cardId: "BT2-010", byEffect: false },
          { cardId: "BT2-011", byEffect: true },
        ],
      },
    ]);
  });

  it("counts attacks, checks, blocks, deletions by cause, digivolutions, plays, memory and effects per player", () => {
    const replay = createReplay([
      { turn: 1, boards: [["p0"], ["p1"]] },
      {
        turn: 1,
        seat: 0,
        boards: [["p0"], ["p1"]],
        events: [
          { kind: "cardPlayed", instanceId: "a", fromZone: "hand", seat: 0, cardId: "BT1-001" },
          { kind: "memoryChanged", from: 3, to: -1, reason: "payCost" },
          { kind: "digivolved", seat: 0, permanentId: "p0", cardId: "BT1-010", mechanic: "normal" },
          { kind: "effectTriggered", seat: 0, sourceCardId: "BT1-010", effectKey: "k", description: "d" },
          {
            kind: "attackDeclared",
            seat: 0,
            attackerPermanentId: "p0",
            attackerCardId: "BT1-010",
            target: { kind: "player" },
          },
          { kind: "blocked", blockerPermanentId: "p1" },
          {
            kind: "cardsMoved",
            instanceIds: ["z"],
            from: "battleArea",
            to: "trash",
            seat: 1,
            battleDeletion: true,
            deletedPermanents: [{ permanentId: "p1", instanceId: "z", cardId: "BT1-020", seat: 1 }],
          },
          { kind: "securityChecked", seat: 1, revealedCardId: "BT1-030", resolution: "trashed" },
          {
            kind: "cardsMoved",
            instanceIds: ["q"],
            from: "battleArea",
            to: "trash",
            seat: 0,
            deletedPermanents: [{ permanentId: "p0", instanceId: "q", cardId: "BT1-010", seat: 0 }],
          },
        ] as ServerEvent[],
      },
    ]);

    const [first, second] = buildReplayPlayerReports({ replay });

    expect(first.stats).toEqual({
      attacks: 1,
      securityChecks: 1,
      blocks: 0,
      lostInBattle: 0,
      lostToEffects: 1,
      digivolutions: 1,
      cardsPlayed: 1,
      memorySpent: 4,
      effects: 1,
    });
    expect(second.stats).toMatchObject({ blocks: 1, lostInBattle: 1, lostToEffects: 0, memorySpent: 0 });
  });
});
