
// @ts-nocheck
import { EffectTiming, isDigiEgg } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, digivolveCostStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT4-095";

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

    // [On Play] Return 1 Digi-Egg card from your trash to the bottom of your Digi-Egg deck.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-egg`,
          description:
            "[On Play] Return 1 Digi-Egg card from your trash to the bottom of your Digi-Egg deck.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.trash.some((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigiEgg(def);
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.trash
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigiEgg(def);
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            if (selected.length === 0) return;

            await ctx.fx.returnToEggDeck?.(selected);
          },
        }),
      ];
    }

    // [Your Turn] BeforePayCost digivolve-cost reduction for Digi-Burst cards.
    // when digivolving one of your Digimon into a hand Digimon with Digi-Burst,
    // suspend this Tamer to reduce cost by 1.
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/digiburst-cost-reduction`,
          description:
            "[Your Turn] When digivolving one of your Digimon into a Digimon card in your hand " +
            "with ＜Digi-Burst＞, you may suspend this Tamer to reduce the digivolution cost by 1.",
          optional: false,
          // Gate: this Tamer is on the battle area, it's the owner's turn, and the INTO card has Digi-Burst.
          canActivate: (ctx) => {
            const me = source.permanent();
            return source.isOnBattleArea() && source.isOwnersTurn() && me !== undefined && !me.isSuspended;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;

            ctx.fx.changeEvoCost(
              (match) =>
                match.target.controllerSeat === source.ownerSeat &&
                !match.target.inBreeding &&
                match.into?.effectText?.includes("Digi-Burst") === true,
              -1,
              {
                once: true,
                onConsume: () => {
                  ctx.fx.payActivationCost?.(me.permanentId, "suspend");
                },
              },
            );
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
