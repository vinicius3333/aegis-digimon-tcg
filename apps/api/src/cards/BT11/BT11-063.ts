import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-063";
const names = ["Numemon", "Sukamon", "Nanimon", "Etemon"];

function isDiscardCandidate(definition: CardDefinition): boolean {
  return definition.cardId === cardId || names.some((name) => definition.nameEn.includes(name));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/also-numemon`,
          description: "This card/Digimon is also treated as [Numemon].",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined)
              ctx.fx.grantNameTrait(self.permanentId, "name", ["Numemon"], EffectDuration.Permanent);
          },
        }),
      ];
    if (timing !== EffectTiming.OnPlay) return [];
    return [
      onPlay({
        source,
        effectKey: `${cardId}/trash-and-draw`,
        description: "[On Play] By trashing 1 [Numemon]/[Sukamon]/[Nanimon]/[Etemon]-named card in hand, draw 2.",
        resolve: async (ctx) => {
          const candidates = ctx.game
            .player(source.ownerSeat)
            .hand.filter(
              (card) => card.instanceId !== source.instanceId && isDiscardCandidate(ctx.game.definitionOf(card)),
            );
          if (candidates.length === 0) return;
          const selected = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map(({ instanceId }) => instanceId),
            min: 0,
            max: 1,
          });
          if (selected.length !== 1) return;
          const trashed = await ctx.fx.trash(selected, { byEffectSeat: source.ownerSeat });
          if (trashed.length === 1) await ctx.fx.draw(source.ownerSeat, 2);
        },
      }),
    ];
  },
};
registerCard(module);
