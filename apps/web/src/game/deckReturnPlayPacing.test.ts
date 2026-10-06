// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { GameState, ServerEvent } from "@aegis/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { recordSnapshot, type StateSnapshot } from "../net/presentedState";
import { DEFAULT_PACING, PACING_BY_STYLE, setBasePacing } from "./pacing";
import { TIMINGS } from "./timings";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

function geometry(): MatchCueAnchors {
  const board = document.createElement("div");
  const pile = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(pile, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 40, 80, 100));
  return {
    board: { current: board },
    permanentCenter: () => ({ x: 320, y: 120 }),
    yourDeck: { current: pile },
    oppDeck: { current: pile },
    yourHandDock: { current: pile },
    oppHandStrip: { current: pile },
    yourSecurity: { current: pile },
    oppSecurity: { current: pile },
  };
}

const permanent = (permanentId: string, instanceId: string, cardId: string) => ({
  permanentId,
  topCard: { instanceId, cardId },
  stack: [],
  currentDP: 0,
});
const board = (stateVersion: number, opponentField: readonly ReturnType<typeof permanent>[]) =>
  ({
    stateVersion,
    players: [
      { seat: 0, battleArea: [], trash: [], hand: [], security: [] },
      { seat: 1, battleArea: opponentField, trash: [], hand: [], security: [] },
    ],
  }) as unknown as GameState;

const asuna = {
  seat: 1 as const,
  sourceCardId: "BT24-088",
  sourceInstanceId: "s1-33",
  sourcePermanentId: "perm-4",
  effectKey: "BT24-088/ir-0-0",
  timing: "OnStartTurn",
  description:
    "[Start of Your Turn] If you have 4 or less memory, by returning this Tamer to the bottom of the deck, you may play 1 [Asuna Shiroki] or 1 level 4 or lower Digimon card with the [TS] trait or [Three Musketeers] in its text from your trash without paying the cost.",
};

/** Anonymized from a live bot match: the trigger, the paid return, the play and the resolution. */
const returnCost: readonly ServerEvent[][] = [
  [{ kind: "effectTriggered", ...asuna, printedTiming: "StartOfYourTurn" }],
  [
    {
      kind: "cardsMoved",
      instanceIds: ["s1-33"],
      from: "various",
      to: "deckBottom",
      seat: 1,
      cardIds: ["BT24-088"],
      artIds: ["BT24-088"],
      returnedPermanents: [
        { permanentId: "perm-4", instanceId: "s1-33", cardId: "BT24-088", artId: "BT24-088", seat: 1 },
      ],
    },
  ],
];
const consequentPlay: readonly ServerEvent[][] = [
  [
    {
      kind: "cardPlayed",
      instanceId: "s1-37",
      fromZone: "trash",
      seat: 1,
      cardId: "BT25-092",
      artId: "BT25-092",
      permanentId: "perm-6",
    },
    { kind: "cardsMoved", instanceIds: ["s1-37"], from: "various", to: "battleArea" },
  ],
  [{ kind: "effectResolved", ...asuna }],
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

// The room's bot answered the play selection 410 ms after the return; a backlogged queue
// receives the play while the return is still waiting for its clause.
it.each([
  { style: "stacked", botAnswerMs: 410 },
  { style: "sequential", botAnswerMs: 410 },
  { style: "stacked", botAnswerMs: 0 },
  { style: "sequential", botAnswerMs: 0 },
] as const)(
  "$style beats, play $botAnswerMs ms later: the paid return lands before the card it pays for is revealed",
  async ({ style, botAnswerMs }) => {
    setBasePacing(PACING_BY_STYLE[style]);
    const before = board(72, [permanent("perm-4", "s1-33", "BT24-088")]);
    const returned = board(74, []);
    const played = board(76, [permanent("perm-6", "s1-37", "BT25-092")]);
    let snapshots: readonly StateSnapshot[] = recordSnapshot([], before);
    let version = 0;
    let fed: readonly ServerBatch[] = [];
    const feed = (batches: readonly (readonly ServerEvent[])[]) => {
      for (const events of batches) fed = [...fed, singleServerBatch(events, (version += 1))];
    };
    const view = renderHook(
      ({ batches, state, taken }: { batches: readonly ServerBatch[]; state: GameState; taken: typeof snapshots }) =>
        useMatchCues({
          state,
          batches,
          snapshots: taken,
          viewerSeat: 0,
          anchors: geometry(),
          mulliganOpen: false,
          onActionRejected: vi.fn<(reason: string) => void>(),
          presentationPacing: "sequential",
        }),
      { initialProps: { batches: fed, state: before, taken: snapshots } },
    );
    const advance = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));
    await advance(0);
    feed(returnCost);
    snapshots = recordSnapshot(snapshots, returned);
    view.rerender({ batches: fed, state: returned, taken: snapshots });
    const seenAt: Record<string, number> = {};
    const playVisibleDuringReturn: number[] = [];
    const probeMs = 8;
    let playFed = false;
    const start = Date.now();
    for (let elapsed = 0; elapsed <= 6_000; elapsed += probeMs) {
      if (elapsed >= botAnswerMs && !playFed) {
        playFed = true;
        feed(consequentPlay);
        snapshots = recordSnapshot(snapshots, played);
        view.rerender({ batches: fed, state: played, taken: snapshots });
      }
      const cues = view.result.current;
      const flying = cues.drawFlights.some((flight) => flight.deckReturn !== undefined);
      if (flying) seenAt.returnStarted ??= Date.now() - start;
      if (seenAt.returnStarted !== undefined && !flying) seenAt.returnLanded ??= Date.now() - start;
      const revealed = cues.zoneShowcase?.cardId === "BT25-092";
      if (revealed) seenAt.playRevealed ??= Date.now() - start;
      const playOnBoard = playFed && !cues.pendingPermanentIds.has("perm-6");
      if (flying && (revealed || playOnBoard)) playVisibleDuringReturn.push(Date.now() - start);
      await advance(probeMs);
    }
    expect(seenAt.returnStarted).toBeDefined();
    expect(seenAt.returnLanded! - seenAt.returnStarted!).toBeGreaterThanOrEqual(TIMINGS.deckReturn - probeMs);
    expect(seenAt.playRevealed).toBeDefined();
    expect(playVisibleDuringReturn).toEqual([]);
    expect(seenAt.playRevealed!).toBeGreaterThanOrEqual(seenAt.returnLanded! + TIMINGS.deckReturnLanding);
  },
);
