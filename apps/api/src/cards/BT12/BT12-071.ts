import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-071";
function black(definition: CardDefinition): boolean {
  return definition.colors.includes(CardColor.Black);
}
function hybrid(definition: CardDefinition): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])].includes(
    "Hybrid",
  );
}
async function attackReveal(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 3);
  const candidates = shown
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return black(def) && def.playCost <= 6;
    })
    .map(({ instanceId }) => instanceId);
  const chosen = candidates.length ? await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 }) : [];
  if (chosen.length) await ctx.fx.playInstances(chosen, { payCost: false });
  const rest = shown.filter(({ instanceId }) => !chosen.includes(instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length) await ctx.fx.trash(rest, { byEffectSeat: source.ownerSeat });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-attack-reveal`,
          description:
            "[Opponent's Turn][Once Per Turn] When an opponent attacks, reveal 3; play a black card costing 6 or less and trash the rest.",
          maxPerTurn: 1,
          when: () => !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOpponentAttacks",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: opponent attacked`,
              run: (subCtx) => attackReveal(subCtx, source),
            });
          },
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/play-hybrid`,
          description: "[On Deletion] You may play a black level 4 or lower Hybrid from hand.",
          optional: true,
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card: CardInstance) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && black(def) && (def.level ?? 99) <= 4 && hybrid(def);
              })
              .map(({ instanceId }) => instanceId);
            if (!candidates.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (picked) await ctx.fx.playInstances([picked], { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
