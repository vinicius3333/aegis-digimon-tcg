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
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
// The REAL authored IR (a hand-override exports it so the A3 asserts against the on-disk source).
import { compiled as BT25_045 } from "./BT25-045.js";
// Boot side-effect: self-register every compiled-IR card module (so BT25-045's real IR loads).
import "../index.js";

/**
 * Full-engine A3 for BT25-045 Onmon's link-cost-reduction clause (plan 08-04), consuming the
 * Phase-7 `LinkAction.costDelta` / `linkCostOf` seam (07-01-SUMMARY.md):
 *
 *   "[Your Turn] [Once Per Turn] When a [Social], [Tool] or [Game] trait card would link to
 *    this Digimon, you may reduce the cost by 1."  (documented behavior WhenWouldLink region,
 *    rule implementation reducedCost:1)
 *
 * KB authority (node tools/kb/query.mjs card BT25-045): no card-specific Q&A; general link
 * rules apply (BT25-089 Q4881: only a <Link>-bearing card may be linked; the cost is real and
 * reducible). BT25-045 is authored here as the EASY discharge that bakes `costDelta:-1` onto a
 * trait-gated, once-per-turn Link action (the cross-actor WhenWouldLink continuous grant — the
 * broader documented behavior shape shared with BT25-004 — is serialized to the engine wave 08-09, per the plan).
 *
 * Vehicle: resolve BT25-045's REAL registered Link effect through the interpreter against a
 * battle-area BT25-045 with a [Social]-trait link card (BT21-009, printed link Cost 1) in hand,
 * and compare the memory paid AS-AUTHORED (costDelta:-1 => pays 0) vs. with the costDelta
 * STRIPPED (pays the full 1). The reduction is exactly 1.
 *
 * FAILS-WHEN-REVERTED: drop the `costDelta:-1` from BT25-045.ts's Link action — the as-authored
 * run then pays the full link cost, the memory delta between the two runs collapses to 0, and the
 * "reduced by exactly 1" assertion goes RED. (Equivalently the proven Phase-7 lever: drop the
 * `+ costDelta` in `linkCostOf`.)
 */

const LINKABLE = "BT21-009"; // [Social] [Appmon] trait, printed "[Link] [Appmon] trait: Cost 1"

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
  memoryPaid: number;
  linkedCount: number;
}

/**
 * Resolve the given compiled BT25-045 IR's [Main]/OnDeclaration Link effect once, returning how
 * much memory the engine charged for the link and how many cards landed. A linkable BT21-009 sits
 * in the controller's hand; BT25-045 is the on-field recipient ("link a card to this Digimon").
 */
async function runLinkEffect(compiled: CompiledCard): Promise<RunResult> {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 10; // ample headroom so a positive link cost is actually paid
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  // The BT25-045 permanent (the link recipient) on seat 0's battle area.
  const recipient = new Permanent();
  recipient.permanentId = "p-onmon";
  recipient.controllerSeat = 0;
  const top = card("BT25-045", 0);
  recipient.topCard = top;
  recipient.baseDP = 3000;
  recipient.currentDP = 3000;
  state.players[0]!.battleArea.push(recipient);

  // A linkable [Social] card in hand.
  const linkCard = card(LINKABLE, 0);
  state.players[0]!.hand.push(linkCard);

  const ledger = new ModifierLedger();
  const continuous = new ContinuousEffectLedger();
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
    chooseTargets: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => "p-x",
    memory,
    modifiers: ledger,
    continuous,
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  const game = createGameAccess(
    state,
    (id) => continuous.linkMaxDelta(id),
    (id, traits) => continuous.linkCostReduction(id, traits),
  );

  const module = irCardModule("BT25-045", compiled);
  const src = createCardSource(recipient.topCard!, stateLookup);
  // Install BT25-045's real recipient grant in the continuous/static window.
  const effects = module.effectsForTiming(EffectTiming.None, src);

  const before = state.memory;
  if (compiled.effects?.some((e) => e.actions?.some((a) => (a as { kind?: string }).kind === "GrantLinkCostReduction"))) {
    for (const e of effects) {
      const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
      await e.resolve(ctx);
    }
  }

  // A separate generic Link declaration targets the recipient carrying the grant.
  const genericLink: CompiledCard = {
    effects: [{
      trigger: "Main",
      actions: [{ kind: "Link", target: { filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] }, count: 1 } }],
    }],
    coverage: "full",
    residual: [],
  };
  const linkModule = irCardModule("BT25-045", genericLink);
  const linkEffects = linkModule.effectsForTiming(EffectTiming.OnDeclaration, src);
  for (const e of linkEffects) {
    const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
    await e.resolve(ctx);
  }
  return { memoryPaid: before - state.memory, linkedCount: recipient.linked.length };
}

/** A clone of BT25-045's registered IR with the grant neutered (the revert). */
function withoutGrant(compiled: CompiledCard): CompiledCard {
  const clone: CompiledCard = JSON.parse(JSON.stringify(compiled));
  for (const eff of clone.effects ?? []) {
    for (const action of eff.actions ?? []) {
      if ((action as { kind?: string }).kind === "GrantLinkCostReduction") (action as { amount?: number }).amount = 0;
    }
  }
  return clone;
}

describe("BT25-045 Onmon — recipient-scoped link-cost reduction", () => {
  it("authors a GrantLinkCostReduction action (amount 1, Social/Tool/Game)", () => {
    const links = (BT25_045.effects ?? [])
      .flatMap((e) => e.actions ?? [])
      .filter((a) => (a as { kind?: string }).kind === "GrantLinkCostReduction") as { amount?: number; whenLinkingTrait?: string[] }[];
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((l) => l.amount === 1)).toBe(true);
    expect(links[0]?.whenLinkingTrait).toEqual(["Social", "Tool", "Game"]);
  });

  it("pays exactly 1 less memory to link a [Social] card than with the reduction reverted", async () => {
    const reduced = await runLinkEffect(BT25_045);
    const full = await runLinkEffect(withoutGrant(BT25_045));

    // Both runs land the single linkable card; the only difference is the recipient grant.
    expect(reduced.linkedCount).toBe(1);
    expect(full.linkedCount).toBe(1);

    // BT21-009 printed link cost is 1; the grant floors it to 0, so the reduced run pays 0 and
    // the reverted run pays the full 1 => the reduction is exactly 1.
    expect(full.memoryPaid).toBe(1);
    expect(reduced.memoryPaid).toBe(0);
    expect(full.memoryPaid - reduced.memoryPaid).toBe(1);
  });
});
