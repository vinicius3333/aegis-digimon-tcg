import type { Permanent } from "@aegis/shared";
import { expect } from "vitest";
import {
  drainMicrotasks,
  settle,
  setupEngine,
  type BoardSpec,
  type CardSpec,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

/**
 * How seat 0 applies "until your opponent's turn ends, 1 of their Digimon can't activate
 * [When Digivolving] effects": BT23-028 Coordemon's [When Linking] onto an Appmon, or
 * BT23-029 Antylamon's [All Turns] reacting to its own play.
 */
export type WhenDigivolvingLockSource = "coordemonLink" | "antylamonPlay";

type LockedSetup = EngineSetup & { preferSubject(): void };

function withLockSource(board: BoardSpec, source: WhenDigivolvingLockSource): BoardSpec {
  const mine = board[0] ?? {};
  const lockHost: PermanentSpec[] = source === "coordemonLink" ? [{ card: "BT21-009", as: "lockHost" }] : [];
  const lockCard: CardSpec = { card: source === "coordemonLink" ? "BT23-028" : "BT23-029", as: "lockCard" };
  return {
    ...board,
    0: {
      ...mine,
      battleArea: [...lockHost, ...(mine.battleArea ?? [])],
      hand: [lockCard, ...(mine.hand ?? [])],
    },
  };
}

/**
 * Apply the lock from `source` to seat 1's `subject` when `lockSubject` is true, otherwise to
 * its `decoy`, which leaves `subject` as the unlocked control. Hands the turn to seat 1
 * afterwards; the lock lasts until their turn ends.
 */
export async function lockOpponentWhenDigivolving(
  board: BoardSpec,
  source: WhenDigivolvingLockSource,
  lockSubject: boolean,
): Promise<LockedSetup> {
  const preferred: string[] = [];
  const s = setupEngine(withLockSource(board, source), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
  });
  const locked = s.perm(lockSubject ? "subject" : "decoy");
  preferred.push(locked.permanentId, locked.topCard.instanceId);
  s.state.memory = 10;
  await s.ready();
  const isLocked = (permanent: Permanent) => observe(s.engine).isRestricted(permanent, "cannotActivateWhenDigivolving");
  const lockCardId = s.inst("lockCard").instanceId;
  const intent =
    source === "coordemonLink"
      ? { type: "linkCard" as const, instanceId: lockCardId, targetPermanentId: s.perm("lockHost").permanentId }
      : { type: "playCard" as const, instanceId: lockCardId };
  expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
  await settle(() => isLocked(locked));
  await settle(() => s.state.pendingDecision === undefined);
  expect(isLocked(s.perm("subject"))).toBe(lockSubject);
  s.state.turnSeat = 1;
  s.state.memory = 10;
  const preferSubject = () => preferred.splice(0, preferred.length, s.perm("subject").permanentId);
  return Object.assign(s, { preferSubject });
}

function seatZeroDp(s: EngineSetup): number {
  return s.state.players[0]!.battleArea.reduce((sum, permanent) => sum + permanent.currentDP, 0);
}

/** Seat 1 digivolves the lock target into BT20-031 Liamon, whose [When Digivolving] gives -3000 DP. */
export async function digivolveIntoLiamon(source: WhenDigivolvingLockSource, lockSubject: boolean) {
  const s = await lockOpponentWhenDigivolving(
    {
      1: {
        battleArea: [
          { card: "BT20-030", as: "subject", dp: 8000 },
          { card: "BT1-009", as: "decoy", dp: 8000 },
        ],
        hand: [{ card: "BT20-031", as: "liamon" }],
      },
    },
    source,
    lockSubject,
  );
  const dpBefore = seatZeroDp(s);

  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("subject").permanentId,
      instanceId: s.inst("liamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("subject").topCard.cardId === "BT20-031" && s.state.pendingDecision === undefined);
  await drainMicrotasks();

  return { dpLost: dpBefore - seatZeroDp(s) };
}

/** A locked EX12-037 Omnimon attacks; its [When Digivolving] [When Attacking] deletes 1 of seat 0's Digimon. */
export async function attackWithLockedOmnimon(source: WhenDigivolvingLockSource) {
  const s = await lockOpponentWhenDigivolving(
    {
      0: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-009", "BT1-010"] },
      1: {
        battleArea: [
          { card: "EX12-037", as: "subject" },
          { card: "BT1-009", as: "decoy", dp: 8000 },
        ],
      },
    },
    source,
    true,
  );
  const digimonBefore = s.state.players[0]!.battleArea.length;

  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("subject").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking(), 3000);

  return { digimonBefore, digimonAfter: s.state.players[0]!.battleArea.length };
}

/**
 * Seat 1 uses BT10-110 Seiken Meppa to unsuspend its BT10-112 Jesmon GX and activate one of its
 * [When Digivolving] effects, which places a Royal Knight card from hand under it.
 */
export async function activateWhenDigivolvingThroughSeikenMeppa(
  source: WhenDigivolvingLockSource,
  lockSubject: boolean,
) {
  const s = await lockOpponentWhenDigivolving(
    {
      1: {
        battleArea: [
          { card: "BT10-112", as: "subject", suspended: true },
          { card: "BT1-009", as: "decoy", dp: 8000 },
        ],
        hand: [
          { card: "BT10-110", as: "seikenMeppa" },
          { card: "BT10-068", as: "royalKnight" },
        ],
      },
    },
    source,
    lockSubject,
  );

  s.preferSubject();
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("seikenMeppa").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT10-110"));
  await drainMicrotasks();

  const royalKnightId = s.inst("royalKnight").instanceId;
  return {
    placedUnder: s.perm("subject").stack.some((card) => card.instanceId === royalKnightId),
    unsuspended: !s.perm("subject").isSuspended,
  };
}

/**
 * Seat 1 digivolves the lock target into BT24-081 Titamon + SkullBaluchimon, whose
 * [When Digivolving] deletes seat 0's lowest-level Digimon "by trashing 1 card in your hand".
 */
export async function digivolveIntoTitamonWithHandCost(source: WhenDigivolvingLockSource, lockSubject: boolean) {
  const s = await lockOpponentWhenDigivolving(
    {
      0: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      1: {
        battleArea: [
          { card: "BT1-080", as: "subject" },
          { card: "BT10-055", as: "decoy" },
        ],
        hand: [
          { card: "BT24-081", as: "titamon" },
          { card: "BT1-013", as: "discard" },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
    },
    source,
    lockSubject,
  );
  const lowestId = s.perm("lowest").permanentId;

  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("subject").permanentId,
      instanceId: s.inst("titamon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("subject").topCard.cardId === "BT24-081");
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks();

  return {
    handCostPaid: !s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("discard").instanceId),
    lowestDeleted: !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === lowestId),
  };
}

/**
 * Seat 1 digivolves the lock target into EX12-037 Omnimon, whose [When Digivolving]
 * [When Attacking] [Once Per Turn] deletes 1 of seat 0's Digimon, then attacks with it.
 */
export async function digivolveIntoOmnimonThenAttack(source: WhenDigivolvingLockSource, lockSubject: boolean) {
  const s = await lockOpponentWhenDigivolving(
    {
      0: { battleArea: ["BT1-009", "BT8-017"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      1: {
        battleArea: [
          { card: "BT10-055", as: "subject" },
          { card: "BT1-009", as: "decoy", dp: 8000 },
        ],
        hand: [{ card: "EX12-037", as: "omnimon" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    },
    source,
    lockSubject,
  );
  const digimonCount = () => s.state.players[0]!.battleArea.length;
  const initial = digimonCount();

  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("subject").permanentId,
      instanceId: s.inst("omnimon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("subject").topCard.cardId === "EX12-037");
  await settle(() => s.state.pendingDecision === undefined);
  await drainMicrotasks();
  const afterDigivolving = digimonCount();

  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("subject").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking(), 3000);

  return {
    deletedWhenDigivolving: initial - afterDigivolving,
    deletedWhenAttacking: afterDigivolving - digimonCount(),
  };
}
