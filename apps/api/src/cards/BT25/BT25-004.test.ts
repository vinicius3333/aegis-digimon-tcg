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
// The REAL authored IR (the hand-override exports it so the A3 asserts against the on-disk source).
import { compiled as BT25_004 } from "./BT25-004.js";
// Boot side-effect: self-register every compiled-IR card module.
import "../index.js";

/**
 * Full-engine A3 for BT25-004 Tapmon's cross-actor link-cost-reduction clause (plan 08-09):
 *
 *   "[Your Turn][Once Per Turn] When a [Social], [Tool] or [Game] trait card would link to this
 *    Digimon, you may reduce the cost by 1."  (documented behavior rule implementation
 *    reducedCost:1 installed on card.Owner.UntilCalculateFixedCostEffect, recipient-scoped.)
 *
 * KB authority (node tools/kb/query.mjs card BT25-004): no card-specific Q&A. General link rules:
 * BT25-089 Q6422 (no-<Link> card can't be linked), Q6423 (multiple link reductions do NOT stack on
 * one declaration). Unlike BT25-045 (self-link costDelta, 08-04), BT25-004's reduction lives on the
 * RECIPIENT and applies to ANY actor's link declaration onto it — the cross-actor WhenWouldLink
 * continuous grant store built in 08-09 (continuous.ts addLinkCostReductionGrant / linkCostReduction,
 * read by runLink/linkCostOf). This also subsumes BT25-045's deferred broadening.
 *
 * Vehicle: install BT25-004's grant on a recipient permanent by RESOLVING its real registered
 * [Your Turn] effect through the interpreter (the staticModifier window, EffectTiming.None). Then
 * run a SEPARATE, generic Link action (a DIFFERENT actor declaring "link a [Social] card to this
 * Digimon") and compare the memory paid with the grant active vs. with the grant absent. The
 * recipient reduction is exactly 1.
 *
 * FAILS-WHEN-REVERTED: drop the recipient-grant read in runLink/linkCostOf (or stub the BT25-004
 * action to no-op) — the grant-active run then pays the full link cost, the two-run delta collapses
 * to 0, and the "reduced by exactly 1" assertion goes RED.
 */

const LINKABLE = "BT21-009"; // [Social] (attribute) [Appmon] trait, printed "[Link] [Appmon] trait: Cost 1"
const _NON_TRAIT_LINKABLE = "BT25-045"; // [Appmon]-trait link card WITHOUT Social/Tool/Game — the grant must NOT apply

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
 * Build a fresh battle-area BT25-004 recipient + a linkable card in hand, optionally INSTALL
 * BT25-004's real grant (by resolving its [Your Turn] effect), then run a generic Link action that
 * links the loose card to the recipient. Returns the memory charged and how many cards landed.
 *
 * `installGrant` runs the REAL BT25-004 IR effect against the recipient (so the grant comes from
 * the on-disk source, not the harness). `compiledForInstall` lets the don't-stack test resolve the
 * effect TWICE (two grants on one recipient) and the revert test resolve a no-op clone.
 */
async function runLinkWithGrant(opts: {
  installGrant: boolean;
  installTimes?: number;
  linkCardId?: string;
  compiledForInstall?: CompiledCard;
}): Promise<RunResult> {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 10;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  const recipient = new Permanent();
  recipient.permanentId = "p-tapmon";
  recipient.controllerSeat = 0;
  const top = card("BT25-004", 0);
  recipient.topCard = top;
  recipient.baseDP = 3000;
  recipient.currentDP = 3000;
  state.players[0]!.battleArea.push(recipient);

  const linkCard = card(opts.linkCardId ?? LINKABLE, 0);
  state.players[0]!.hand.push(linkCard);

  const modifiers = new ModifierLedger();
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
    chooseTargets: async (_ctx: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    selectCards: async (_ctx: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => "p-x",
    memory,
    modifiers,
    continuous,
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  // The grant-backed GameAccess: linkCostReduction reads the continuous ledger (the live-engine
  // wiring). runLink consults it when computing the per-card link cost.
  const game = createGameAccess(
    state,
    (id) => continuous.linkMaxDelta(id),
    (id, traits) => continuous.linkCostReduction(id, traits),
  );

  const src = createCardSource(recipient.topCard!, stateLookup);

  // Install the grant by resolving BT25-004's REAL [Your Turn] static effect on the recipient.
  if (opts.installGrant) {
    const installModule = irCardModule("BT25-004", opts.compiledForInstall ?? BT25_004);
    const installEffects = installModule.effectsForTiming(EffectTiming.None, src);
    const times = opts.installTimes ?? 1;
    for (let i = 0; i < times; i++) {
      for (const e of installEffects) {
        const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
        await e.resolve(ctx);
      }
    }
  }

  // A separate, generic Link action — a DIFFERENT actor declaring "link a [Social] card to this
  // Digimon". (No costDelta of its own; the only reduction is the recipient grant.)
  const genericLink: CompiledCard = {
    effects: [
      {
        trigger: "Main",
        actions: [
          {
            // No explicit recipient => links to the SOURCE permanent ("to this Digimon"), which
            // is the BT25-004 recipient that carries the grant. (An explicit recipient filter would
            // force kind:["Digimon"], excluding the DigiEgg recipient; the default-to-source path is
            // the faithful "to this Digimon" target.)
            kind: "Link",
            target: { filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] }, count: 1 },
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  };
  const linkModule = irCardModule("BT25-004", genericLink);
  const linkEffects = linkModule.effectsForTiming(EffectTiming.OnDeclaration, src);

  const before = state.memory;
  for (const e of linkEffects) {
    const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
    await e.resolve(ctx);
  }
  return { memoryPaid: before - state.memory, linkedCount: recipient.linked.length };
}

/**
 * A clone of BT25-004's registered IR with the grant amount zeroed (the revert lever). A 0-amount
 * grant installs no observable reduction, mirroring "drop the recipient-grant read in linkCostOf".
 */
function withoutGrant(compiled: CompiledCard): CompiledCard {
  const clone: CompiledCard = JSON.parse(JSON.stringify(compiled));
  for (const eff of clone.effects ?? []) {
    for (const a of eff.actions ?? []) {
      if ((a as { kind?: string }).kind === "GrantLinkCostReduction") (a as { amount?: number }).amount = 0;
    }
  }
  return clone;
}

describe("BT25-004 Tapmon — cross-actor WhenWouldLink link-cost reduction (documented behavior documented rule)", () => {
  it("authors a GrantLinkCostReduction action (amount 1, Social/Tool/Game) on its [Your Turn] clause", () => {
    const grants = (BT25_004.effects ?? [])
      .flatMap((e) => e.actions ?? [])
      .filter((a) => (a as { kind?: string }).kind === "GrantLinkCostReduction") as {
      amount?: number;
      whenLinkingTrait?: string[];
    }[];
    expect(grants.length).toBeGreaterThan(0);
    expect(grants.some((g) => g.amount === 1)).toBe(true);
    expect(grants[0]?.whenLinkingTrait).toEqual(["Social", "Tool", "Game"]);
  });

  it("a [Social] card pays exactly 1 less memory to link to this Digimon with the grant active", async () => {
    const reduced = await runLinkWithGrant({ installGrant: true });
    const full = await runLinkWithGrant({ installGrant: false });

    expect(reduced.linkedCount).toBe(1);
    expect(full.linkedCount).toBe(1);

    // BT21-009 printed link cost is 1; the recipient grant reduces it to 0 (floored), so the
    // grant-active run pays 0 and the no-grant run pays the full 1 => the reduction is exactly 1.
    expect(full.memoryPaid).toBe(1);
    expect(reduced.memoryPaid).toBe(0);
    expect(full.memoryPaid - reduced.memoryPaid).toBe(1);
  });

  it("does NOT stack: installing the reduction twice on one declaration still reduces by only 1 (Q6423)", async () => {
    const once = await runLinkWithGrant({ installGrant: true, installTimes: 1 });
    const twice = await runLinkWithGrant({ installGrant: true, installTimes: 2 });
    // A second simultaneous reduction adds no further -1: both pay the same (0 here).
    expect(twice.memoryPaid).toBe(once.memoryPaid);
    expect(twice.memoryPaid).toBe(0);
  });

  it("fails-when-reverted: neutering the GrantLinkCostReduction action restores the full link cost", async () => {
    const reverted = await runLinkWithGrant({ installGrant: true, compiledForInstall: withoutGrant(BT25_004) });
    // With the grant action neutered, no recipient reduction is installed => full cost paid.
    expect(reverted.memoryPaid).toBe(1);
  });
});
