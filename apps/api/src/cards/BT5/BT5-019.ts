import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT5-019 — OmniShoutmon (Red Lv.5 Digimon).
 *
 *
 * ＜Blitz＞ (definitional keyword — handled by card definition).
 *
 * [When Digivolving] You may place 1 red Digimon card from your hand at the top of
 * this Digimon's digivolution cards. Then, for each [OmniShoutmon] or [ZeigGreymon]
 * in this Digimon's digivolution cards, delete 1 of your opponent's Digimon with
 * 5000 DP or less.
 */
const cardId = "BT5-019";

function isOmniShoutmonOrZeigGreymon(def: CardDefinition): boolean {
  return (
    def.nameEn === "OmniShoutmon" ||
    def.nameEn === "ZeigGreymon"
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/blitz`,
          description: "[When Digivolving] ＜Blitz＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blitz", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-under-delete`,
          description:
            "[When Digivolving] You may place 1 red Digimon card from your hand at the top of " +
            "this Digimon's digivolution cards. Then, for each [OmniShoutmon] or [ZeigGreymon] " +
            "in this Digimon's digivolution cards, delete 1 of your opponent's Digimon with " +
            "5000 DP or less.",
          optional: true,
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            // Part 1: Optionally place 1 red Digimon from hand as top digivolution card.
            const owner = ctx.game.player(source.ownerSeat);
            const redDigimonInHand = owner.hand.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.colors ?? []).includes(CardColor.Red);
            });
            if (redDigimonInHand.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: redDigimonInHand.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: true });
              }
            }

            // Re-fetch self after potential stack mutation.
            const selfAfter = source.permanent();
            if (selfAfter === undefined) return;

            // Part 2: Count OmniShoutmon/ZeigGreymon in digivolution cards.
            const count = selfAfter.stack.filter((c) =>
              isOmniShoutmonOrZeigGreymon(ctx.game.definitionOf(c)),
            ).length;
            if (count === 0) return;

            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const targets = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && p.currentDP <= 5000;
              })
              .map((p) => p.permanentId);
            if (targets.length === 0) return;

            const maxDelete = Math.min(count, targets.length);
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets,
              min: 1,
              max: maxDelete,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen);
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
