import { EffectTiming } from "@aegis/shared";
import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

/**
 * Crimson Blaze's own "reduce the memory cost of this card in your hand" lowers its use
 * cost itself, one per opposing Digimon. Returns the memory change across the use.
 */
export async function crimsonBlazeMemoryDelta(watcherCardId: string, opposingCount: number): Promise<number> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: watcherCardId, as: "watcher" }, "BT8-007"],
        hand: [{ card: "BT8-097", as: "crimsonBlaze" }],
        deck: [...DECK],
      },
      1: {
        battleArea: Array.from({ length: opposingCount }, () => ({ card: "BT1-009", dp: 20_000 })),
        deck: [...DECK],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimsonBlaze").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
  );
  await drainMicrotasks();
  return s.state.memory - 5;
}

/** Taomon uses a 2-cost yellow Option with only the cost to pay reduced by 2, so it pays 0. */
export async function taomonReducedPaymentUse(watcherCardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: watcherCardId, as: "watcher" },
          { card: "BT17-035", as: "taomon" },
        ],
        hand: [{ card: "BT1-102", as: "option" }],
        deck: [...DECK],
      },
    },
    { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
  );
  s.state.memory = 0;
  await s.ready();
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("taomon"));
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
      s.state.pendingDecision === undefined,
  );
  await drainMicrotasks();
  return s;
}

/** Dan & Kanan use a 3-cost [TS] Option from the hand without paying its cost. */
export async function tamerFreeOptionUse(watcherCardId: string): Promise<EngineSetup> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: watcherCardId, as: "watcher" },
          { card: "BT24-085", as: "tamer" },
        ],
        hand: [{ card: "BT24-092", as: "option" }],
      },
      1: { battleArea: [{ card: "BT11-111", as: "target" }] },
    },
    { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
  );
  s.state.memory = -3;
  await s.ready();
  await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("tamer"));
  await settle(() => s.perm("target").currentDP === 8000 && s.state.pendingDecision === undefined);
  await drainMicrotasks();
  return s;
}
