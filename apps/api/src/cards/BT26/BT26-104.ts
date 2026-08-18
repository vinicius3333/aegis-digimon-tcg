import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-104 — Kunlun (BT26, White Tamer).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-104` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Start of Your Main Phase] Gain 1 memory.
 *   [On Play] By trashing 1 [Shambala] trait card from your hand, <Draw 2>
 *   [End of Your Turn] If you have a Digimon with the [Tentei Hachibushu] trait, by
 *     suspending this Tamer, you may use 1 Option card with the [Shambala] trait from
 *     your hand without paying the cost.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — unconditional "gain 1 memory", modeled on the same
 *     turnTiming shape as BT26-090's memory-gain clause but without a threshold guard.
 *     Mandatory (no cost), so `optional: false` and a plain `ctx.fx.gainMemory(1)` body.
 *
 *   EffectTiming.OnPlay — cost-then-benefit, modeled on BT26-089's/BT26-091's
 *     "By placing/trashing 1 [trait] card from your hand, <verb>" shape (`optional: true`,
 *     `canActivate` requires an eligible [Shambala] card in hand, `resolve` lets the
 *     controller pick 0-or-1 candidate — declining pays no cost and draws nothing).
 *     Trashing uses `ctx.fx.trash` (the loose-hand-card trash primitive; this card is an
 *     On-Play window so the source itself is already a battle-area permanent, not in
 *     hand, and is therefore never a candidate for its own cost). <Draw 2> uses
 *     `ctx.fx.draw(source.ownerSeat, 2)`.
 *
 *   EffectTiming.OnEndTurn — "If you have a Digimon with the [Tentei Hachibushu] trait, by
 *     suspending this Tamer, you may use 1 Option card with the [Shambala] trait from your
 *     hand without paying the cost." The trait-Digimon check is a plain `canActivate`
 *     condition (not a trigger), modeled on BT26-090's/BT26-091's condition-gated
 *     `[End of Your Turn]`/`[Your Turn]` clauses. The mandatory cost ("by suspending this
 *     Tamer") is paid via `ctx.fx.suspend`, mirroring BT26-089's/BT26-091's
 *     `suspendSelf` helper; the optional benefit ("you may use 1 Option card ... without
 *     paying the cost") is modeled on EX4-030's/BT26-090's "use 1 Option card from your
 *     hand ... without paying the cost" shape: `ctx.fx.useOptionFromHand(instanceId,
 *     originalCost)`, carrying the ORIGINAL printed cost for any watcher gate (KB
 *     Q5471-Q5473 pattern seen in EX4-030/EX2-060) even though no cost is actually paid
 *     here — unlike BT26-090, there is no cost reduction to apply first.
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-104";

function hasShambalaTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Shambala");
}

function isShambalaOption(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Option as string)) return false;
  return hasShambalaTrait(def);
}

function shambalaOptionCandidates(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isShambalaOption(ctx.game.definitionOf(c)));
}

function hasTenteiHachibushuDigimon(ctx: EffectContext, ownerSeat: 0 | 1): boolean {
  return ctx.game.player(ownerSeat).battleArea.some((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && (def.types ?? []).includes("Tentei Hachibushu");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Start of Your Main Phase] Gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] Gain 1 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [On Play] By trashing 1 [Shambala] trait card from your hand, <Draw 2>
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-shambala-draw-2`,
          description: "[On Play] By trashing 1 [Shambala] trait card from your hand, <Draw 2>",
          optional: true,
          canActivate: (ctx) => ctx.game.player(ownerSeat).hand.some((c) => hasShambalaTrait(ctx.game.definitionOf(c))),
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ownerSeat)
              .hand.filter((c) => hasShambalaTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.trash(chosen);
            await ctx.fx.draw(ownerSeat, 2);
          },
        }),
      ];
    }

    // [End of Your Turn] If you have a Digimon with the [Tentei Hachibushu] trait, by
    // suspending this Tamer, you may use 1 Option card with the [Shambala] trait from
    // your hand without paying the cost.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-suspend-use-shambala-option`,
          description:
            "[End of Your Turn] If you have a Digimon with the [Tentei Hachibushu] trait, " +
            "by suspending this Tamer, you may use 1 Option card with the [Shambala] " +
            "trait from your hand without paying the cost.",
          optional: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!hasTenteiHachibushuDigimon(ctx, ownerSeat)) return false;
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            return shambalaOptionCandidates(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            const candidates = shambalaOptionCandidates(ctx, ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.suspend([self.permanentId]);

            const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
            const originalCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;
            await ctx.fx.useOptionFromHand(ctx, chosen[0]!, originalCost);
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
