import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-019";

function hasGammamonInText(def: CardDefinition): boolean {
  return def.nameEn.includes("Gammamon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Reveal the top 4 cards of your deck. Add 1 card with [Gammamon] in its " +
            "text among them to the hand. Return the rest to the bottom of the deck.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 4);
            if (deckCards.length === 0) return;
            const gammas = deckCards.filter((c) => hasGammamonInText(ctx.game.definitionOf(c)));
            let added: string[] = [];
            if (gammas.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: gammas.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              added = chosen;
            }
            const rest = deckCards.filter((c) => !added.includes(c.instanceId));
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest.map((c) => c.instanceId), { toTop: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/protect-gammamon`,
          description:
            "[All Turns] When one of your Digimon with [Gammamon] in its text, other than [Bokomon], " +
            "would leave the battle area other than by one of your effects, by deleting this Digimon, " +
            "prevent it from leaving.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (/*ctx*/) => {
            // ENGINE-GAP: wouldLeavePlay replacement not yet surfaced in staticModifier resolve;
            // this effect (Bokomon sacrificing itself to prevent a Gammamon from leaving play)
            // requires a subscribeReplacement / prevent pattern not reachable here.
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
