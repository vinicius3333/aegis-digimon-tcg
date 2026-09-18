// @vitest-environment jsdom

/* Interleaving fuzz for the presentation queue.
 *
 * The freeze that prompted this file needed no particular card and no particular rule.
 * Three attacks in a row was enough: the second check was staged before the first one's
 * outcome arrived, the first check's blow gate was left closed, and the deletion waiting
 * on it sat under a 45s ceiling with the dead Digimon still standing on the board.
 *
 * What varies there is only the ORDER the server's events reach the client in, and which
 * of them share a batch — a space small enough to search. Each case replays one valid
 * interleaving of several attacks and then asserts the one property the freeze broke: the
 * presentation always catches up with the server. Gates that run out their ceiling fail
 * separately, through the guard in test/setupGateExpiry.ts.
 */

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { recordSnapshot, type StateSnapshot } from "../net/presentedState";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

const VIEWER = 0;
const ATTACKS = 3;
const CASES = 24;
/* Long enough to run past every ceiling in the presentation, so a beat that was rescued by
   its ceiling instead of being handed over is reported by the gate guard rather than
   quietly waited out. Fake timers make the span free. */
const DRAIN_BUDGET_MS = 50_000;
const TICK_MS = 160;

interface Attacker {
  permanentId: string;
  instanceId: string;
  cardId: string;
}

const attackers: readonly Attacker[] = Array.from({ length: ATTACKS }, (_, index) => ({
  permanentId: `perm-a${index}`,
  instanceId: `s0-a${index}`,
  cardId: "AD1-002",
}));

function boardWithout(trashed: ReadonlySet<string>, stateVersion: number): GameState {
  const standing = attackers.filter((attacker) => !trashed.has(attacker.instanceId));
  return {
    stateVersion,
    players: [
      {
        battleArea: standing.map((attacker) => ({
          permanentId: attacker.permanentId,
          topCard: { instanceId: attacker.instanceId, cardId: attacker.cardId },
          stack: [],
          currentDP: 3000,
        })),
        trash: attackers
          .filter((attacker) => trashed.has(attacker.instanceId))
          .map((attacker) => ({ instanceId: attacker.instanceId, cardId: attacker.cardId })),
        hand: [],
        security: [],
      },
      { battleArea: [], trash: [], hand: [], security: [] },
    ],
  } as unknown as GameState;
}

const anchors: MatchCueAnchors = {
  board: { current: null },
  permanentCenter: (permanentId) =>
    attackers.some((attacker) => attacker.permanentId === permanentId) ? { x: 120, y: 80 } : undefined,
  yourDeck: { current: null },
  oppDeck: { current: null },
  yourHandDock: { current: null },
  oppHandStrip: { current: null },
  yourSecurity: { current: null },
  oppSecurity: { current: null },
};

/** The events one attack produces, in the only order the server can send them. */
function scriptFor(attacker: Attacker, index: number): readonly ServerEvent[] {
  const revealedCardId = `BT18-01${index}`;
  return [
    {
      kind: "attackDeclared",
      seat: 0,
      attackerPermanentId: attacker.permanentId,
      attackerCardId: attacker.cardId,
      attackerArtId: attacker.cardId,
      target: { kind: "player" },
    },
    {
      kind: "securityRevealed",
      seat: 1,
      revealedCardId,
      artId: revealedCardId,
      attackerPermanentId: attacker.permanentId,
      attackerArtId: attacker.cardId,
      securityCardDP: 9000,
      attackerDP: 3000,
      hasSecurityEffect: false,
      isDigimon: true,
    },
    {
      kind: "cardsMoved",
      instanceIds: [attacker.instanceId],
      from: "battleArea",
      to: "trash",
      deletedPermanents: [
        { permanentId: attacker.permanentId, instanceId: attacker.instanceId, cardId: attacker.cardId, seat: 0 },
      ],
    },
    {
      kind: "securityChecked",
      seat: 1,
      revealedCardId,
      artId: revealedCardId,
      resolution: "battle",
      battle: { securityDigimonDeleted: false, attackerDeleted: true, attackerDP: 3000, securityCardDP: 9000 },
    },
  ] as ServerEvent[];
}

/** Mulberry32: a seeded generator, so a failing case is reported as a seed to replay. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * One valid interleaving, grouped into batches. Each attack keeps its own event order;
 * which attack advances next, and where the batch boundaries fall, is what varies.
 */
function interleave(random: () => number): readonly (readonly ServerEvent[])[] {
  const scripts = attackers.map((attacker, index) => scriptFor(attacker, index));
  const cursors = scripts.map(() => 0);
  const order: ServerEvent[] = [];
  for (;;) {
    const live = cursors.flatMap((cursor, index) => (cursor < scripts[index]!.length ? [index] : []));
    if (live.length === 0) break;
    const picked = live[Math.floor(random() * live.length)]!;
    order.push(scripts[picked]![cursors[picked]!]!);
    cursors[picked]! += 1;
  }
  const batches: ServerEvent[][] = [];
  for (const event of order) {
    const last = batches.at(-1);
    if (last && random() < 0.4) last.push(event);
    else batches.push([event]);
  }
  return batches;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

interface CueProps {
  batches: readonly ServerBatch[];
  state: GameState;
  snapshots: readonly StateSnapshot[];
}

function renderFuzzCues() {
  let version = 0;
  let batches: readonly ServerBatch[] = [];
  const trashed = new Set<string>();
  let board = boardWithout(trashed, 1);
  let snapshots = recordSnapshot([], board);
  const view = renderHook(
    ({ batches: fed, state, snapshots: taken }: CueProps) =>
      useMatchCues({
        narrationLimit: 3,
        batches: fed,
        state,
        snapshots: taken,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending: false,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: { batches: [], state: board, snapshots } as CueProps },
  );
  return {
    ...view,
    feedBatch(fresh: readonly ServerEvent[]) {
      for (const event of fresh) {
        if (event.kind === "cardsMoved" && event.to === "trash") for (const id of event.instanceIds) trashed.add(id);
      }
      board = boardWithout(trashed, (version += 1) + 1);
      snapshots = recordSnapshot(snapshots, board);
      batches = [...batches, singleServerBatch(fresh, version)];
      view.rerender({ batches, state: board, snapshots });
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the presentation catches up whatever order the server's checks arrive in", () => {
  for (let index = 0; index < CASES; index += 1) {
    const seed = 0x51ede + index * 7919;
    it(`drains a security-check interleaving (seed ${seed})`, async () => {
      const batches = interleave(randomFrom(seed));
      const view = renderFuzzCues();
      await advance(0);
      for (const batch of batches) {
        view.feedBatch(batch);
        await advance(16);
      }
      // Every attacker the server deleted owes the viewer a shatter. A burst that never
      // plays is the freeze this file is named for: the card stands on a board the
      // presentation has stopped advancing, and nothing else here goes red about it.
      const shattered = new Set<number>();
      for (let elapsed = 0; elapsed < DRAIN_BUDGET_MS; elapsed += TICK_MS) {
        for (const burst of view.result.current.deleteBursts) shattered.add(burst.key);
        const settled =
          shattered.size === ATTACKS &&
          !view.result.current.presenting &&
          view.result.current.presentedStateVersion === undefined &&
          view.result.current.heldBlowState === undefined &&
          view.result.current.deleteBursts.length === 0;
        if (settled) break;
        await advance(TICK_MS);
      }
      // The seed in the test name replays this exact interleaving; nothing else is needed
      // to reproduce a failure.
      expect({
        shattered: shattered.size,
        presenting: view.result.current.presenting,
        presentedStateVersion: view.result.current.presentedStateVersion,
        heldBlow: view.result.current.heldBlowState !== undefined,
        bursts: view.result.current.deleteBursts.length,
      }).toEqual({
        shattered: ATTACKS,
        presenting: false,
        presentedStateVersion: undefined,
        heldBlow: false,
        bursts: 0,
      });
    });
  }
});
