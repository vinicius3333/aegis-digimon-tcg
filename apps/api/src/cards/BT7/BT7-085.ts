import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-085 — Takuya Kanbara (BT7, Red Tamer).
 *
 *
 * Printed text (no errata):
 *   [Security] Play this card without paying its memory cost.
 *   [Main][Once Per Turn] You may place 5 cards with [Hybrid] in their traits from your
 *   trash under this Tamer in any order to digivolve it into an [EmperorGreymon] in your
 *   hand for its digivolution cost as if this Tamer is a level 5 red Digimon.
 *   [Inherited] [Your Turn] This Digimon gets +2000 DP. While this Digimon has 10000 DP
 *   or more, it gains ＜Security Attack +1＞.
 *
 * Q1652-Q1654: the digivolve is optional; you may skip it after placing 5 cards.
 * Must place exactly 5 Hybrid cards. Can only digivolve into EmperorGreymon.
 *
 * The Main effect involves placing 5 Hybrid-trait cards from trash under this Tamer as
 * digivolution cards, temporarily treating this Tamer as a level 5 red Digimon to
 * digivolve into EmperorGreymon from hand paying its cost. This complex multi-step mechanic
 * is modeled as a single activation with a placement cost and digivolve resolution.
 */
const cardId = "BT7-085";

// interpreter.ts matchNameOrTrait). "Hybrid" is stored under `forms` in cards.json
// (never `types`), so the trait check must span the full union, not just `types`.
function hasHybridTrait(def: { types?: string[]; forms?: string[]; attributes?: string[] }): boolean {
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes("Hybrid");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    // [Main][Once Per Turn] Place 5 Hybrid cards from trash under this Tamer,
    // then optionally digivolve into EmperorGreymon from hand as if this is a level 5 red Digimon.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-digivolve`,
          description:
            "[Main][Once Per Turn] You may place 5 cards with [Hybrid] in their traits from " +
            "your trash under this Tamer in any order to digivolve it into an [EmperorGreymon] " +
            "in your hand for its digivolution cost as if this Tamer is a level 5 red Digimon.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            const hybridCount = owner.trash.filter((c) =>
              hasHybridTrait(ctx.game.definitionOf(c)),
            ).length;
            return hybridCount >= 5;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            const owner = ctx.game.player(source.ownerSeat);
            const hybridCards = owner.trash
              .filter((c) => hasHybridTrait(ctx.game.definitionOf(c)));
            const hybridCandidates = hybridCards.map((c) => c.instanceId);

            if (hybridCandidates.length < 5) return;

            // Select 5 Hybrid cards from trash.
            let selected = await ctx.ask.selectCards(ctx, {
              candidates: hybridCandidates,
              min: 5,
              max: 5,
              visibleCards: hybridCards.map((card) => ({
                instanceId: card.instanceId,
                cardId: card.cardId,
              })),
            });

            if (selected.length !== 5) return;

            if (ctx.ask.orderCards !== undefined) {
              selected = await ctx.ask.orderCards(ctx, {
                candidates: selected,
                visibleCards: hybridCards
                  .filter((card) => selected.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "stackBottom",
              });
            }

            // placeUnder prepends bottom sources, so reverse the chosen bottom-to-top order.
            await ctx.fx.placeUnder(me.permanentId, [...selected].reverse());

            // Temporarily treat this Tamer as a level 5 red Digimon for the digivolve.
            // (engine capability: `treatBaseAs` — the digivolve legality + cost path
            //  needs to see this tamer as level 5 red Digimon).
            // For now, we record the intent and attempt the digivolve into EmperorGreymon
            // from hand, paying its printed cost.
            const hand = owner.hand;
            const emperorCards = hand.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn.includes("EmperorGreymon");
            });

            if (emperorCards.length === 0) return;

            const [emperorId] = await ctx.ask.selectCards(ctx, {
              candidates: emperorCards.map((card) => card.instanceId),
              min: 0,
              max: 1,
              visibleCards: emperorCards.map((card) => ({
                instanceId: card.instanceId,
                cardId: card.cardId,
              })),
            });
            if (emperorId === undefined) return;

            // Digivolve this permanent into the EmperorGreymon from hand.
            // The digivolve pays cost and ignores normal level/color requirements
            // since the Tamer is treated as a level 5 red Digimon.
            await ctx.fx.digivolveFromInstance(me.permanentId, emperorId, {
              payCost: true,
              ignoreRequirements: true,
              costOverride: 4,
              draw: true,
            });
          },
        }),
      ];
    }

    // [Inherited][Your Turn] +2000 DP, and if DP >= 10000, ＜Security Attack +1＞.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp`,
          description: "[Your Turn] This Digimon gets +2000 DP.",
          optional: false,
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.modifyDP(me.permanentId, 2000, EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-sa1`,
          description: "[Your Turn] While this Digimon has 10000 DP or more, it gains ＜Security Attack +1＞.",
          optional: false,
          isInherited: true,
          when: (_ctx) => {
            if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
            const me = source.permanent();
            return me !== undefined && me.currentDP >= 10000;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              ctx.fx.grantKeyword(me.permanentId, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
