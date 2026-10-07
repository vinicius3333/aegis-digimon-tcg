// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { recordSnapshot, selectPresentedState, type StateSnapshot } from "../net/presentedState";
import { visibleBoard } from "./screen/model/visibleBoard";
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
    permanentStack: (permanentId) => ({ x: 320, y: 120, width: 72, height: 100.8, angle: 0, permanentId }),
    yourDeck: { current: pile },
    oppDeck: { current: pile },
    yourHandDock: { current: pile },
    oppHandStrip: { current: pile },
    yourSecurity: { current: pile },
    oppSecurity: { current: pile },
  };
}

const craniamonOwner: Seat = 1;
const opponent: Seat = 0;

function board({
  stateVersion,
  suspended,
  dp,
  handSize,
  turnSeat,
  turnCount,
  phase,
}: {
  stateVersion: number;
  suspended: boolean;
  dp: number;
  handSize: number;
  turnSeat: Seat;
  turnCount: number;
  phase: string;
}): GameState {
  const craniamon = {
    permanentId: "perm-1",
    topCard: { instanceId: "s1-31", cardId: "EX13-062", artId: "EX13-062" },
    stack: [{ instanceId: "s1-52", cardId: "P-245", artId: "P-245" }],
    linked: [],
    isSuspended: suspended,
    currentDP: dp,
    keywords: ["Reboot", "Blocker"],
  };
  const hand = Array.from({ length: handSize }, (_, index) => ({
    instanceId: `s1-hand-${index}`,
    cardId: "BT1-009",
    artId: "BT1-009",
  }));
  return {
    stateVersion,
    turnSeat,
    turnCount,
    phase,
    memory: 0,
    players: [
      { seat: 0, battleArea: [], trash: [], hand: [], handCount: 5, security: [], securityCount: 5, deckCount: 40 },
      {
        seat: 1,
        battleArea: [craniamon],
        trash: [],
        hand,
        handCount: handSize,
        security: [],
        securityCount: 5,
        deckCount: 40 - handSize,
      },
    ],
  } as unknown as GameState;
}

const kakkinmon = {
  seat: craniamonOwner,
  sourceCardId: "P-245",
  sourceInstanceId: "s1-52",
  sourcePermanentId: "perm-1",
  effectKey: "P-245/ir-3-0",
  description:
    "[End of All Turns] [Once Per Turn] By suspending 1 of your black Digimon with ＜Blocker＞, if your hand has 7 or fewer cards, ＜Draw 1＞",
  timing: "OnEndTurn",
  isInherited: true,
};
const rebootBonus = {
  seat: craniamonOwner,
  sourceCardId: "EX13-062",
  sourceInstanceId: "s1-31",
  sourcePermanentId: "perm-1",
  effectKey: "subtrigger/669/When this Digimon unsuspends, it gets +3000 DP until your turn ends",
  description: "[All Turns] When this Digimon unsuspends, it gets +3000 DP until your turn ends.",
  timing: "whenUnsuspended",
};

/** Production match 6b32b755, turn 5, seq 226-245: one board per closed batch. */
const productionBatches: readonly {
  events: ServerEvent[];
  state: Omit<Parameters<typeof board>[0], "stateVersion">;
}[] = [
  {
    events: [{ kind: "effectTriggered", ...kakkinmon, printedTiming: "EndOfAllTurns" }],
    state: { suspended: false, dp: 12000, handSize: 5, turnSeat: 1, turnCount: 5, phase: "End" },
  },
  {
    events: [{ kind: "cardsMoved", instanceIds: ["perm-1"], from: "unsuspended", to: "suspended" }],
    state: { suspended: true, dp: 12000, handSize: 5, turnSeat: 1, turnCount: 5, phase: "End" },
  },
  {
    events: [{ kind: "cardsMoved", instanceIds: ["s1-26"], from: "deck", to: "hand", handAddition: "draw", seat: 1 }],
    state: { suspended: true, dp: 12000, handSize: 6, turnSeat: 1, turnCount: 5, phase: "End" },
  },
  {
    events: [{ kind: "effectResolved", ...kakkinmon }],
    state: { suspended: true, dp: 12000, handSize: 6, turnSeat: 1, turnCount: 5, phase: "End" },
  },
  {
    events: [{ kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: 5 }],
    state: { suspended: true, dp: 12000, handSize: 6, turnSeat: 0, turnCount: 5, phase: "Active" },
  },
  {
    events: [{ kind: "phaseChanged", phase: "Active", turnSeat: 0, turnCount: 5 } as ServerEvent],
    state: { suspended: true, dp: 12000, handSize: 6, turnSeat: 0, turnCount: 5, phase: "Active" },
  },
  {
    events: [{ kind: "cardsMoved", instanceIds: ["perm-1"], from: "suspended", to: "unsuspended" }],
    state: { suspended: false, dp: 12000, handSize: 6, turnSeat: 0, turnCount: 5, phase: "Active" },
  },
  {
    events: [{ kind: "effectTriggered", ...rebootBonus, printedTiming: "AllTurns" }],
    state: { suspended: false, dp: 12000, handSize: 6, turnSeat: 0, turnCount: 5, phase: "Active" },
  },
  {
    events: [{ kind: "effectResolved", ...rebootBonus }],
    state: { suspended: false, dp: 15000, handSize: 6, turnSeat: 0, turnCount: 5, phase: "Active" },
  },
  {
    events: [{ kind: "phaseChanged", phase: "Draw", turnSeat: 0, turnCount: 6 } as ServerEvent],
    state: { suspended: false, dp: 15000, handSize: 6, turnSeat: 0, turnCount: 6, phase: "Draw" },
  },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const probeMs = 8;

async function presentEndOfTurnSuspend(viewerSeat: Seat) {
  const firstVersion = 89;
  const before = board({
    stateVersion: firstVersion - 1,
    suspended: false,
    dp: 12000,
    handSize: 5,
    turnSeat: 1,
    turnCount: 5,
    phase: "Main",
  });
  let snapshots: readonly StateSnapshot[] = recordSnapshot([], before);
  let live = before;
  const fed: ServerBatch[] = [];
  const view = renderHook(
    ({ batches, state, taken }: { batches: readonly ServerBatch[]; state: GameState; taken: typeof snapshots }) =>
      useMatchCues({
        state,
        batches,
        snapshots: taken,
        viewerSeat,
        anchors: geometry(),
        mulliganOpen: false,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: { batches: [...fed], state: live, taken: snapshots } },
  );
  const advance = (ms: number) => act(async () => vi.advanceTimersByTimeAsync(ms));
  await advance(0);
  // The server closes these batches within one engine run: they arrive as one burst.
  productionBatches.forEach(({ events, state }, index) => {
    const stateVersion = firstVersion + index;
    const batch = singleServerBatch(events, stateVersion);
    // The server stamps a batch's events with the revision it opened on; its close names the next.
    fed.push({ ...batch, events: batch.events.map((event) => ({ ...event, stateVersion: stateVersion - 1 })) });
    live = board({ stateVersion, ...state });
    snapshots = recordSnapshot(snapshots, live);
  });
  view.rerender({ batches: [...fed], state: live, taken: snapshots });
  const frames: { at: number; suspended: boolean; dp: number }[] = [];
  for (let elapsed = 0; elapsed <= 12_000; elapsed += probeMs) {
    const cues = view.result.current;
    const displayed = selectPresentedState({ live, snapshots, presentedStateVersion: cues.presentedStateVersion })!;
    const visible = visibleBoard({ live, displayed, viewerSeat, cues });
    const craniamon = visible?.players[craniamonOwner].battleArea.find(({ permanentId }) => permanentId === "perm-1");
    if (craniamon) {
      const last = frames.at(-1);
      if (!last || last.suspended !== craniamon.isSuspended || last.dp !== craniamon.currentDP)
        frames.push({ at: elapsed, suspended: craniamon.isSuspended, dp: craniamon.currentDP });
    }
    await advance(probeMs);
  }
  return frames;
}

it.each([craniamonOwner, opponent])(
  "viewer %i sees Craniamon turn sideways before Reboot stands it up (Discord 1557481090870939840)",
  async (viewerSeat) => {
    const frames = await presentEndOfTurnSuspend(viewerSeat);
    const suspendedFrame = frames.findIndex((frame) => frame.suspended);
    expect(frames, JSON.stringify(frames)).not.toEqual([]);
    expect(suspendedFrame, JSON.stringify(frames)).toBeGreaterThanOrEqual(0);
    const standsUp = frames.findIndex((frame, index) => index > suspendedFrame && !frame.suspended);
    expect(standsUp, JSON.stringify(frames)).toBeGreaterThan(suspendedFrame);
    expect(frames[standsUp]!.at - frames[suspendedFrame]!.at).toBeGreaterThanOrEqual(300);
  },
);
