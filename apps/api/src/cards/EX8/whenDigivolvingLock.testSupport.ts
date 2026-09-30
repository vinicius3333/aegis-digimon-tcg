import { EffectTiming } from "@aegis/shared";
import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup, type SeatSpec } from "../../engine/testkit/harness.js";
import "./index.js";

/**
 * Seat 0's card that stops seat 1's Digimon from activating [When Digivolving] effects:
 * EX8-023 PolarBearmon locks one source-less Digimon through its [On Play]; EX8-035
 * MarineAngemon locks every opposing Digimon while seat 0 has 1 or more memory.
 */
export type WhenDigivolvingLock = "EX8-023" | "EX8-035";

/**
 * Lay the board with seat 0's lock card, apply the lock to seat 1's `locked` permanent, and
 * hand the turn to seat 1 with `seatOneMemory` available (seat 0 then holds its negation).
 */
export async function lockedBoard(
  lock: WhenDigivolvingLock,
  seatZero: SeatSpec,
  seatOne: SeatSpec,
  seatOneMemory: number,
  lockedAlias = "locked",
): Promise<EngineSetup> {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: { ...seatZero, battleArea: [{ card: lock, as: "lock" }, ...(seatZero.battleArea ?? [])] },
      1: seatOne,
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
  );
  preferInstanceIds.push(s.perm(lockedAlias).permanentId);
  await s.ready();
  if (lock === "EX8-023") {
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lock"));
    await settle(() => s.state.pendingDecision === undefined);
  }
  s.state.turnSeat = 1;
  s.state.memory = seatOneMemory;
  await advance(s.engine).recompute();
  expect(s.state.pendingDecision).toBeUndefined();
  return s;
}

/** Seat 1 digivolves `alias` into the hand card `evolverAlias` through its alternate route. */
export async function seatOneDigivolves(s: EngineSetup, alias: string, evolverAlias: string, cardId: string) {
  expect(
    s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm(alias).permanentId,
      instanceId: s.inst(evolverAlias).instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm(alias).topCard.cardId === cardId && s.state.pendingDecision === undefined);
}

export function effectTriggeredFor(s: EngineSetup, cardId: string): boolean {
  return s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === cardId);
}

/** Seat 1 digivolves EX8-023 into EX8-028 Skadimon, whose [When Digivolving] would play EX8-019 from hand. */
export async function skadimonOverLockedBase(lock: WhenDigivolvingLock, seatOneMemory: number) {
  const s = await lockedBoard(
    lock,
    { battleArea: [{ card: "BT1-009", as: "sourceLess" }], security: ["BT1-010", "BT1-011"] },
    {
      battleArea: [{ card: "EX8-023", as: "locked" }],
      hand: [
        { card: "EX8-028", as: "evolver" },
        { card: "EX8-019", as: "iceSnow" },
      ],
    },
    seatOneMemory,
  );
  await seatOneDigivolves(s, "locked", "evolver", "EX8-028");
  return s;
}

/** Seat 1 plays EX8-047, so the locked EX8-074's [All Turns] tries to activate its own [When Digivolving] deletion. */
export async function medievalGallantmonReactivation(lock: WhenDigivolvingLock, seatOneMemory: number) {
  const s = await lockedBoard(
    lock,
    { battleArea: [{ card: "BT1-009", as: "deletable", dp: 8000 }] },
    { battleArea: [{ card: "EX8-074", as: "locked" }], hand: [{ card: "EX8-047", as: "played" }] },
    seatOneMemory,
  );
  const playedId = s.inst("played").instanceId;
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId) &&
      s.state.pendingDecision === undefined,
  );
  return s;
}

/** Seat 1 digivolves EX8-008 into EX8-059, whose [When Digivolving] asks to trash a hand card as its "by" cost. */
export async function devimonOverLockedBase(lock: WhenDigivolvingLock, seatOneMemory: number) {
  const s = await lockedBoard(
    lock,
    {},
    {
      battleArea: [{ card: "EX8-008", as: "locked" }],
      hand: [
        { card: "EX8-059", as: "evolver" },
        { card: "BT1-045", as: "payable" },
      ],
      deck: ["BT1-028", "BT1-037"],
    },
    seatOneMemory,
  );
  await seatOneDigivolves(s, "locked", "evolver", "EX8-059");
  return s;
}
