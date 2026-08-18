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
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
// The REAL authored IR (the override exports it so the A3 asserts against the on-disk source).
import { compiled as BT15_092 } from "./BT15-092.js";
import "../index.js";


const YELLOW_LV3 = "BT1-045"; // a yellow Lv.3 Digimon (matches "yellow level 4 or lower")

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
  playedFromSecurity: boolean;
  battleAreaCount: number;
}

/**
 * Resolve BT15-092's [Main] effect once. BT15-092 (the Option) is the effect source; a yellow Lv.3
 * Digimon sits in seat 0's security stack — the eligible "play without cost" target.
 */
async function runMainEffect(compiled: CompiledCard): Promise<RunResult> {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 5; // headroom: a "cost charged" would reduce memory; the play is free
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  // The using Option as the effect source (it resolves from a non-battle-area context).
  const source = card("BT15-092", 0);

  // The eligible yellow Lv.3 Digimon in seat 0's security stack.
  const secDigimon = card(YELLOW_LV3, 0);
  state.players[0]!.security.push(secDigimon);

  const ledger = new ModifierLedger();
  const memory = new MemoryGauge(state, (e) => events.push(e));

  const stateLookup: CardStateLookup = {
    permanentOf: () => undefined,
    isOnBattleArea: () => false,
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  const ask: SelectionPort = {
    selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max),
  };
  const decisionApi = {
    selectPermanents: async () => [],
    optional: async () => true,
    chooseTargets: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => `perm-${++seq}`,
    memory,
    modifiers: ledger,
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  const game = createGameAccess(state);

  const module = irCardModule("BT15-092", compiled);
  const src = createCardSource(source, stateLookup);
  // An Option's [Main] body is its on-play effect: it files under OnUseOption (the window
  // play-card fires when the Option resolves from hand), NOT OnDeclaration.
  const effects = module.effectsForTiming(EffectTiming.OnUseOption, src);
  for (const e of effects) {
    const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
    await e.resolve(ctx);
  }

  const playedFromSecurity =
    state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secDigimon.instanceId) &&
    !state.players[0]!.security.some((c) => c.instanceId === secDigimon.instanceId);
  return { playedFromSecurity, battleAreaCount: state.players[0]!.battleArea.length };
}

/** A clone of BT15-092's registered IR with the PlayWithoutCost action removed (the revert). */
function withoutPlay(compiled: CompiledCard): CompiledCard {
  const clone: CompiledCard = JSON.parse(JSON.stringify(compiled));
  for (const eff of clone.effects ?? []) {
    eff.actions = (eff.actions ?? []).filter((a) => (a as { kind?: string }).kind !== "PlayWithoutCost");
  }
  return clone;
}

describe("BT15-092 Revelation of Light — [Main] play-from-security (use-option sign-off: no such clause exists)", () => {
  it("keeps the security/static -5000 DP clauses intact (Phase-7 faithful, not regressed)", () => {
    const security = (BT15_092.effects ?? []).find((e) => e.trigger === "Security");
    expect(security).toBeDefined();
    const secKinds = (security!.actions ?? []).map((a) => (a as { kind?: string }).kind);
    expect(secKinds).toContain("ModifyDP");
    expect(secKinds).toContain("ModifySecurityDP");
    const staticEff = (BT15_092.effects ?? []).find((e) => e.trigger === "Static");
    expect(staticEff).toBeDefined(); // the whenSecurityRemoved trash-trigger clause is preserved
  });

  it("plays a yellow Lv.4-or-lower Digimon from security for free (as authored)", async () => {
    const r = await runMainEffect(BT15_092);
    expect(r.playedFromSecurity).toBe(true);
    expect(r.battleAreaCount).toBe(1);
  });

  it("goes inert when the PlayWithoutCost wiring is reverted (fails-when-reverted)", async () => {
    const r = await runMainEffect(withoutPlay(BT15_092));
    expect(r.playedFromSecurity).toBe(false);
    expect(r.battleAreaCount).toBe(0);
  });
});
