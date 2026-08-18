import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-017 — Zanbamon (BT26, Red/Purple Lv.6 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-017` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.5 w/[Shambala]/[TS] trait: Cost 3
 *   [Assembly -4] 2 Lv.5 or lower [Shambala] trait cards w/different levels
 *   ＜Blocker＞
 *   ＜Retaliation＞
 *   [On Play] [When Digivolving] 1 of your Digimon with the [Shambala] trait gains
 *     ＜Security A. +1＞ and ＜Progress＞ for the turn.
 *   [On Deletion] You may play 1 [Shambala] or [TS] trait card with a play cost of 5 or
 *     less from your trash without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.None — ＜Blocker＞/＜Retaliation＞ static grants (`hasKeyword` on the
 *     continuous ledger, not `resolveKeywords`' printed-text scan, is what combat legality
 *     actually reads — BT5-085/BT12-063/EX12-073 precedent — so both need an explicit grant).
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "1 of your Digimon with the
 *     [Shambala] trait gains <Security A. +1> and <Progress> for the turn." "For the
 *     turn" = EffectDuration.UntilEachTurnEnd (BT26-093 precedent).
 *   EffectTiming.OnDestroyedAnyone — "You may play 1 [Shambala] or [TS] trait card with a
 *     play cost of 5 or less from your trash without paying the cost."
 *
 * [Assembly -4] is structural play-legality data (assemblyRequirement), not an
 * EffectModule clause; per this port's constraints, effects.json is not touched for
 * BT26 cards, so the Assembly requirement is not structurally enforced for this card yet.
 */
const cardId = "BT26-017";

function hasShambalaTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Shambala");
}

function hasTsTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "TS");
}

function ownShambalaDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && hasShambalaTrait(def);
    })
    .map((p) => p.permanentId);
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
        staticModifier({
          source,
          effectKey: `${cardId}/retaliation`,
          description: "＜Retaliation＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [On Play] / [When Digivolving] 1 of your Digimon with the [Shambala] trait gains
    // <Security A. +1> and <Progress> for the turn.
    const resolveGrant = async (ctx: EffectContext): Promise<void> => {
      const candidates = ownShambalaDigimonIds(ctx, source);
      if (candidates.length === 0) return;
      const chosen =
        candidates.length === 1
          ? candidates[0]!
          : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
      if (chosen === undefined) return;
      ctx.fx.grantKeyword(chosen, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
      ctx.fx.grantKeyword(chosen, "Progress", EffectDuration.UntilEachTurnEnd);
    };

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-grant-shambala`,
          description:
            "[On Play] [When Digivolving] 1 of your Digimon with the [Shambala] trait gains " +
            "＜Security A. +1＞ and ＜Progress＞ for the turn.",
          optional: false,
          resolve: resolveGrant,
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-grant-shambala`,
          description:
            "[On Play] [When Digivolving] 1 of your Digimon with the [Shambala] trait gains " +
            "＜Security A. +1＞ and ＜Progress＞ for the turn.",
          optional: false,
          resolve: resolveGrant,
        }),
      ];
    }

    // [On Deletion] You may play 1 [Shambala] or [TS] trait card with a play cost of 5 or
    // less from your trash without paying the cost.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-from-trash`,
          description:
            "[On Deletion] You may play 1 [Shambala] or [TS] trait card with a play cost of " +
            "5 or less from your trash without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.trash
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (hasShambalaTrait(def) || hasTsTrait(def)) && def.playCost <= 5;
              })
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const picked = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (picked.length === 0) return;
            await ctx.fx.playInstances(picked, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
