import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-037 — Weatherdramon (BT26, Green Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-037` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [App Fusion] [Weathermon] & [Rocketmon] & [Newsmon]: Cost 0
 *   [Assembly -2] Lv.3 [Navi]/[System]/[Seven Code] trait Digimon card
 *   ＜Blocker＞
 *   ＜Detach ([Seven Code] trait)＞
 *   [On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Navi],
 *     [System] or [Seven Code] trait from this Digimon's digivolution cards to this
 *     Digimon without paying the cost.
 *
 * Clause mapping: identical shape to its sibling BT26-028 (Medicmon) — see that file's
 * header for the full rationale. This card grants ＜Blocker＞ instead of ＜Barrier＞, and
 * the link-eligible traits are [Navi]/[System]/[Seven Code] instead of [Life]/[System]/
 * [Seven Code].
 *
 * RESIDUAL — ＜Detach ([Seven Code] trait)＞: same unimplementable-keyword rationale as
 * BT26-028 (see `engine/effects/detach.ts`'s module header) — zero KB rules-corpus hits,
 * unpublished behavior, intentionally not implemented. Re-check the moment
 * `node tools/kb/query.mjs rules "Detach"` returns a hit or an official ruling surfaces.
 *
 * [App Fusion] and [Assembly -2] are structural play-legality data, not EffectModule
 * clauses; per this port's constraints, effects.json is not touched for BT26 cards, so
 * neither requirement is structurally enforced for this card yet.
 */
const cardId = "BT26-037";

function linkEligibleTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Navi") || cardHasTrait(def, "System") || cardHasTrait(def, "Seven Code");
}

function hasLinkRequirement(def: CardDefinition): boolean {
  const requirement = def.linkRequirement?.trim();
  return requirement !== undefined && requirement.length > 0 && requirement !== "-";
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [On Play] / [When Digivolving] You may link 1 level 3 Digimon card with the [Navi],
    // [System] or [Seven Code] trait from this Digimon's digivolution cards to this
    // Digimon without paying the cost.
    const resolveLink = async (ctx: import("../../engine/effects/EffectContext.js").EffectContext): Promise<void> => {
      const self = ctx.source.permanent();
      if (self === undefined) return;
      const candidates = self.stack.filter((c) => {
        const def = ctx.game.definitionOf(c);
        return isDigimon(def) && def.level === 3 && linkEligibleTrait(def) && hasLinkRequirement(def);
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
            "[Navi], [System] or [Seven Code] trait from this Digimon's digivolution " +
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
            "[Navi], [System] or [Seven Code] trait from this Digimon's digivolution " +
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
