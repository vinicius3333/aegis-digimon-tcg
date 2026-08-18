import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
  type CompiledCard,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
// The REAL authored IR (the hand-override exports it so the A3 asserts against the on-disk source).
import { compiled as EX8_037 } from "./EX8-037.js";
// Boot side-effect: self-register every compiled-IR card module (so the used Option's [Main] loads).
import "../index.js";

/**
 * Full-engine A3 for EX8-037 Sakuyamon (X Antibody)'s [Your Turn] use-option clause (plan 08-06),
 * consuming the 08-05 UseOptionWithoutCost engine path (NOT rebuilt):
 *
 *   "[Your Turn][Once Per Turn] When one of your Digimon attacks, you may use 1 1-color Option
 *    card with a use cost of 5 or less from your hand without paying the cost. If you did, 1 of
 *    your Digimon unsuspends."  (documented behavior PlayOptionCards payCost:false)
 *
 * KB authority (node tools/kb/query.mjs card EX8-037):
 *   Q3923/Q4737: once you used an Option, the "if this effect used" tail (unsuspend 1) runs and is
 *     MANDATORY. Q4738: the tail's use-result is bound at use-time (ctx.lastOptionUsed).
 *
 * Vehicle: a real single-color cost-<=5 Option whose [Main] DRAWS (BT1-097, Blue, cost 1, Draw 1)
 * sits in the controller's hand; a SUSPENDED own Digimon sits on the field. Resolve EX8-037's real
 * [Your Turn] effect through the interpreter and assert: (1) the Option's [Main] RESOLVED (a card
 * was drawn), (2) NO Option cost was charged (memory not reduced), (3) the Option went to trash,
 * (4) the mandatory unsuspend tail ran (the suspended Digimon is now unsuspended).
 *
 * The [Your Turn] clause is authored as a `SubTrigger("whenAttacking", ...)` (matching the
 * BT15-010 IR pattern — see EX8-037.ts) rather than a bare action list: "[Your Turn] when one of
 * your Digimon attacks" is a reactive on-attack watcher, not a continuously-reapplied static
 * effect, so `timingForTrigger` files it at `EffectTiming.None` (continuous/static) as an install
 * of that watcher. Resolving the top-level effect therefore only SUBSCRIBES the watcher (mirrors
 * production `recomputeContinuousEffects`); the harness then fires the `whenAttacking` SubTrigger
 * bus itself (mirrors production `GameEngine.fireSubTrigger`, driven from the same
 * `SubTriggerRegistry` instance shared via `PrimitivesEngine.subTriggers`) to run the watcher body.
 *
 * FAILS-WHEN-REVERTED: strip the `UseOptionWithoutCost` action from EX8-037's IR — no Option is
 * used, so nothing is drawn/trashed, ctx.lastOptionUsed stays false, and the gated unsuspend tail
 * is skipped (the Digimon stays suspended). All four positive assertions go RED.
 */

const OPTION = "BT1-097"; // Blue (single-color), use cost 1 (<=5), [Main] <Draw 1> unconditional

let seq = 0;
function card(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

interface RunResult {
  drewCount: number;
  memoryPaid: number;
  optionTrashed: boolean;
  attackerStillSuspended: boolean;
}

/**
 * Resolve the given compiled EX8-037 IR's [Your Turn] effect once. A real cost-2 yellow Option
 * (BT1-102, <Draw 1>) sits in seat 0's hand; a SUSPENDED own Digimon (the canonical unsuspend
 * target) is on the field; the deck has a card so the Option's Draw is observable.
 */
async function runYourTurnEffect(compiled: CompiledCard): Promise<RunResult> {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 5; // headroom so a "cost charged" would show as a memory reduction
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  // The EX8-037 permanent (a Digimon) on seat 0's battle area — the using card / effect source.
  const sakuyamon = new Permanent();
  sakuyamon.permanentId = "p-sakuyamon";
  sakuyamon.controllerSeat = 0;
  sakuyamon.topCard = card("EX8-037", 0);
  sakuyamon.baseDP = 11000;
  sakuyamon.currentDP = 11000;
  state.players[0]!.battleArea.push(sakuyamon);

  // A SUSPENDED own Digimon — the "if used, 1 of your Digimon unsuspends" tail target.
  const ally = new Permanent();
  ally.permanentId = "p-ally";
  ally.controllerSeat = 0;
  ally.topCard = card("BT1-045", 0); // a yellow Lv.3 Digimon
  ally.baseDP = 4000;
  ally.currentDP = 4000;
  ally.isSuspended = true;
  state.players[0]!.battleArea.push(ally);

  // The eligible Option in hand + a deck card so its [Main] <Draw 1> is observable.
  const option = card(OPTION, 0);
  state.players[0]!.hand.push(option);
  state.players[0]!.deck.push(card("BT1-045", 0));

  const ledger = new ModifierLedger();
  const memory = new MemoryGauge(state, (e) => events.push(e));

  const stateLookup: CardStateLookup = {
    permanentOf: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return perm;
      return undefined;
    },
    isOnBattleArea: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return true;
      return false;
    },
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  const ask: SelectionPort = {
    selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max),
  };
  const decisionApi = {
    selectPermanents: async () => [],
    optional: async () => true,
    // The unsuspend tail offers all of the controller's Digimon; pick the SUSPENDED ally (the only
    // one a player would unsuspend) so the observable proves the tail acted.
    chooseTargets: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.includes("p-ally") ? ["p-ally"] : opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  // Shared with the engine below so the test can fire the SubTrigger bus itself after the
  // [Your Turn] effect installs its "when one of your Digimon attacks" watcher into it.
  const subTriggers = new SubTriggerRegistry();

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => "p-x",
    memory,
    modifiers: ledger,
    subTriggers,
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  const game = createGameAccess(state);

  const module = irCardModule("EX8-037", compiled);
  const src = createCardSource(sakuyamon.topCard!, stateLookup);
  // The [Your Turn] use-option clause files under the continuous/static window (EffectTiming.None)
  // — resolving it installs the "whenAttacking" watcher (SubTrigger action) into `subTriggers`
  // without running its body (mirrors `recomputeContinuousEffects`).
  const effects = module.effectsForTiming(EffectTiming.None, src);

  const handBefore = state.players[0]!.hand.length;
  const memoryBefore = state.memory;
  for (const e of effects) {
    const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
    await e.resolve(ctx);
  }

  // Fire the installed watcher: `ally` (seat 0's own suspended Digimon) attacks. Mirrors
  // `GameEngine.fireSubTrigger`/`combat/controller.ts`'s real "whenAttacking" payload shape
  // (`attackerPermanentId`), against the SAME registry instance the effect subscribed into.
  await subTriggers.fire(
    "whenAttacking",
    () => createEffectContext({ source: src, trigger: { attackerPermanentId: ally.permanentId }, game, fx, ask: decisionApi }),
  );

  // The Option left the hand (used). A drawn card re-enters the hand, so count via the deck shrink.
  const optionTrashed = state.players[0]!.trash.some((c) => c.instanceId === option.instanceId);
  const deckDrew = 1 - state.players[0]!.deck.length; // deck started with 1; a Draw empties it
  void handBefore;
  return {
    drewCount: deckDrew,
    memoryPaid: memoryBefore - state.memory,
    optionTrashed,
    attackerStillSuspended: ally.isSuspended,
  };
}

/**
 * A clone of EX8-037's registered IR with the UseOptionWithoutCost action removed (the revert).
 * The action sits nested inside the [Your Turn] clause's SubTrigger("whenAttacking", ...) watcher
 * (matching the BT15-010 IR pattern), so the strip recurses into `action.actions` — a top-level-only
 * filter would miss it entirely and leave the "reverted" IR behaviorally unchanged.
 */
function withoutUseOption(compiled: CompiledCard): CompiledCard {
  const clone: CompiledCard = JSON.parse(JSON.stringify(compiled));
  const strip = (actions: { kind?: string; actions?: unknown[] }[] | undefined): { kind?: string; actions?: unknown[] }[] => {
    return (actions ?? [])
      .filter((a) => a.kind !== "UseOptionWithoutCost")
      .map((a) => (a.actions !== undefined ? { ...a, actions: strip(a.actions as typeof actions) } : a));
  };
  for (const eff of clone.effects ?? []) {
    eff.actions = strip(eff.actions as { kind?: string; actions?: unknown[] }[] | undefined) as typeof eff.actions;
  }
  return clone;
}

describe("EX8-037 Sakuyamon (X Antibody) — use-option-without-cost + mandatory unsuspend tail", () => {
  it("authors a UseOptionWithoutCost action gated to an ifThisEffectUsed unsuspend tail", () => {
    const yourTurn = (EX8_037.effects ?? []).find((e) => e.trigger === "YourTurn");
    expect(yourTurn).toBeDefined();
    // "when one of your Digimon attacks" is authored as a SubTrigger("whenAttacking", ...) watcher
    // install (matching the BT15-010 IR pattern — see EX8-037.ts), not a bare top-level action
    // list; its body (the actual use-option + unsuspend tail) is the SubTrigger's nested actions.
    const topLevel = (yourTurn!.actions ?? []).map((a) => (a as { kind?: string }).kind);
    expect(topLevel).toEqual(["SubTrigger"]);
    const whenAttacking = (yourTurn!.actions ?? []).find(
      (a) => (a as { kind?: string }).kind === "SubTrigger",
    ) as { event?: string; actions?: { kind?: string; condition?: { kind?: string } }[] } | undefined;
    expect(whenAttacking?.event).toBe("whenAttacking");
    const nestedKinds = (whenAttacking?.actions ?? []).map((a) => a.kind);
    expect(nestedKinds).toContain("UseOptionWithoutCost");
    const unsuspend = (whenAttacking?.actions ?? []).find((a) => a.kind === "Unsuspend");
    expect(unsuspend?.condition?.kind).toBe("ifThisEffectUsed");
  });

  it("uses an eligible Option for free, trashes it, and runs the mandatory unsuspend (as authored)", async () => {
    const r = await runYourTurnEffect(EX8_037);
    expect(r.drewCount).toBe(1); // the Option's [Main] <Draw 1> RESOLVED
    expect(r.memoryPaid).toBe(0); // the use was free (no Option cost charged)
    expect(r.optionTrashed).toBe(true); // the Option resolved then went to trash
    expect(r.attackerStillSuspended).toBe(false); // the mandatory unsuspend tail ran
  });

  it("goes inert when the UseOptionWithoutCost wiring is reverted (fails-when-reverted)", async () => {
    const r = await runYourTurnEffect(withoutUseOption(EX8_037));
    expect(r.drewCount).toBe(0); // no Option used => nothing drawn
    expect(r.optionTrashed).toBe(false); // the Option is untouched
    expect(r.attackerStillSuspended).toBe(true); // ifThisEffectUsed is false => the tail is skipped
  });
});
