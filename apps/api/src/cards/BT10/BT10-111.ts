import { EffectDuration, EffectTiming, digiXrosRequirementFor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-111";

function hasDigiXrosRequirement(def: CardDefinition): boolean {
  return (digiXrosRequirementFor(def.cardId)?.length ?? 0) > 0;
}

function topCardHasShoutmonName(ctx: EffectContext, source: CardSource): boolean {
  const perm = source.permanent?.();
  if (perm === undefined || perm.topCard === undefined) return false;
  return ctx.game.definitionOf(perm.topCard).nameEn?.includes("Shoutmon") === true;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    if (timing === EffectTiming.None) {
      return [
        // (Rule) Name: Also treated as [Shoutmon] — persistent name alias.
        staticModifier({
          source,
          effectKey: `${cardId}/static-name-shoutmon`,
          description: "(Rule) Name: Also treated as [Shoutmon].",
          maxPerTurn: -1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const perm = ctx.source.permanent?.();
            if (perm === undefined) return;
            ctx.fx.grantNameTrait(perm.permanentId, "name", ["Shoutmon"], EffectDuration.UntilEachTurnEnd);
          },
        }),

        // Material Save 1 — consumed by the deletion replacement path.
        staticModifier({
          source,
          effectKey: `${cardId}/static-material-save-1`,
          description: "＜Material Save 1＞ — retain 1 material when this Digimon leaves play.",
          maxPerTurn: -1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const perm = ctx.source.permanent?.();
            if (perm === undefined) return;
            ctx.fx.grantKeyword(perm.permanentId, "MaterialSave", EffectDuration.UntilEachTurnEnd, 1);
          },
        }),

        // [Your Turn] (Inherited) +2000 DP while top digivolution card has [Shoutmon] in name.
        //   IsExistOnBattleArea && IsOwnerTurn && top card ContainsCardName("Shoutmon").
        staticModifier({
          source,
          effectKey: `${cardId}/static-inherited-shoutmon-dp-boost`,
          description:
            "[Your Turn] (Inherited) When this Digimon has a card with [Shoutmon] in its name as its " +
            "top digivolution card, this Digimon gets +2000 DP.",
          maxPerTurn: -1,
          isInherited: true,
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            topCardHasShoutmonName(ctx, source),
          resolve: async (ctx) => {
            const perm = ctx.source.permanent?.();
            if (perm === undefined) return;
            ctx.fx.modifyDP(perm.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [On Play] Return 1 card with a DigiXros requirement from trash to hand.
    // Then grants DigiXros substitution for the turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-digixros-card`,
          description:
            "[On Play] Return 1 card with a DigiXros requirement from your trash to your hand. " +
            "When DigiXrosing this turn, you may use this Digimon in place of one of the DigiXros requirements.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const ownerPlayer = ctx.game.player(ownerSeat);
            const candidates = Array.from(ownerPlayer.trash)
              .filter((c) => hasDigiXrosRequirement(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
            }

            const self = ctx.source.permanent?.();
            if (self !== undefined) {
              ctx.fx.grantKeyword(
                self.permanentId,
                "DigiXrosSubstitute",
                EffectDuration.UntilOwnerTurnEnd,
              );
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
