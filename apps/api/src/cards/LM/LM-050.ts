import { EffectTiming, isDigimon, isTamer, CardColor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-050";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/red-color-waiver`,
          description:
            "You may also use this card if you have a red Digimon or Tamer in play, " +
            "treating it as also being a red card.",
          when: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (isDigimon(def) || isTamer(def)) && def.colors.includes(CardColor.Red);
            });
          },
          resolve: async () => {},
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-reveal`,
          description:
            "[Main] Reveal the top 3 cards of your deck. Add 1 red or purple Digimon card " +
            "among them to the hand. Return the rest to the bottom of the deck. Then, place " +
            "this card in the battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 3);
            if (deckCards.length > 0) {
              const candidates = deckCards.filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && (def.colors.includes(CardColor.Red) || def.colors.includes(CardColor.Purple));
              });
              let added: string[] = [];
              if (candidates.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                added = chosen;
              }
              if (added.length > 0) {
                await ctx.fx.returnToHand(added);
              }
              const rest = deckCards.filter((c) => !added.includes(c.instanceId));
              if (rest.length > 0) {
                await ctx.fx.returnToDeck(rest.map((c) => c.instanceId), { toTop: false });
              }
            }
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
        activated({
          source,
          effectKey: `${cardId}/delay-gain-memory`,
          description: "＜Delay＞ [Main] Gain 2 memory.",
          resolve: async (ctx) => {
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Place this card in the battle area.",
          resolve: async (ctx) => {
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
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
