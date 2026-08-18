import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-028 — Medicmon (BT26, Yellow Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-028` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [App Fusion] [Aidmon] & [Supplemon] & [Spamon]: Cost 0
 *   [Assembly -2] Lv.3 [Life]/[System]/[Seven Code] trait Digimon card
 *   ＜Barrier＞
 *   ＜Detach ([Seven Code] trait)＞
 *   [On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Life],
 *     [System] or [Seven Code] trait from this Digimon's digivolution cards to this
 *     Digimon without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.None — ＜Barrier＞ static grant (`hasKeyword` on the continuous ledger
 *     is what combat legality reads, not the printed-text scan — BT5-085/BT12-063
 *     precedent).
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "You may link 1 level 3 Digimon
 *     card with the [Life], [System] or [Seven Code] trait from this Digimon's
 *     digivolution cards to this Digimon without paying the cost." Modeled on EX11-073's
 *     `self.stack.filter(...)` + `ctx.fx.link(self.permanentId, chosen)` shape.
 *
 * RESIDUAL — ＜Detach ([Seven Code] trait)＞: per `engine/effects/detach.ts`'s module
 * header, the KB has ZERO occurrences of "Detach" (`node tools/kb/query.mjs rules
 * "Detach"` returns no hit) and the source documented behavior reference predates BT26, so what the
 * keyword actually DOES, WHEN it can be used, and WHERE the detached card goes are all
 * unpublished. Per AGENTS.md and the card-module contract, inventing behavior from printed text alone is
 * exactly what implementation must not do, so this keyword is intentionally NOT implemented on
 * this card. Every other printed clause is implemented above. Re-check the moment
 * `node tools/kb/query.mjs rules "Detach"` returns a hit or an official ruling surfaces.
 *
 * [App Fusion] and [Assembly -2] are structural play-legality data (appFusionRequirement /
 * assemblyRequirement), not EffectModule clauses; per this port's constraints,
 * effects.json is not touched for BT26 cards, so neither requirement is structurally
 * enforced for this card yet (same gap as every other hand-implemented BT26 card in this set).
 */
const cardId = "BT26-028";

function linkEligibleTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Life") || cardHasTrait(def, "System") || cardHasTrait(def, "Seven Code");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/barrier`,
          description: "＜Barrier＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Barrier", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [On Play] / [When Digivolving] You may link 1 level 3 Digimon card with the [Life],
    // [System] or [Seven Code] trait from this Digimon's digivolution cards to this
    // Digimon without paying the cost.
    const resolveLink = async (ctx: import("../../engine/effects/EffectContext.js").EffectContext): Promise<void> => {
      const self = ctx.source.permanent();
      if (self === undefined) return;
      const candidates = self.stack.filter((c) => {
        const def = ctx.game.definitionOf(c);
        return isDigimon(def) && def.level === 3 && linkEligibleTrait(def);
      });
      if (candidates.length === 0) return;
      const candidateIds = candidates.map((c) => c.instanceId);
      const picked = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: 0, max: 1 });
      if (picked.length === 0) return;
      await ctx.fx.link(self.permanentId, picked);
    };

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-link`,
          description:
            "[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the " +
            "[Life], [System] or [Seven Code] trait from this Digimon's digivolution " +
            "cards to this Digimon without paying the cost.",
          optional: false,
          resolve: resolveLink,
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-link`,
          description:
            "[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the " +
            "[Life], [System] or [Seven Code] trait from this Digimon's digivolution " +
            "cards to this Digimon without paying the cost.",
          optional: false,
          resolve: resolveLink,
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
