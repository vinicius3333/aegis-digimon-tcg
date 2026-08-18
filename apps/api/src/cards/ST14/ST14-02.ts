import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST14-02";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/digivolve-beelzemon`,
          description:
            "With 20 cards in trash, may digivolve into Beelzemon from trash for cost 3 ignoring requirements.",
          optional: true,
          when: (ctx) => ctx.game.player(source.ownerSeat).trash.length >= 20,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) =>
                matchNameOrTrait(ctx.game.definitionOf(card), { tokens: ["Beelzemon"], match: "name" }),
              )
              .map(({ instanceId }) => instanceId);
            if (!candidates.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (picked)
              await ctx.fx.digivolveFromInstance(self.permanentId, picked, {
                payCost: true,
                costOverride: 3,
                ignoreRequirements: true,
              });
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-delete-level3`,
          description:
            "[Your Turn][Once Per Turn] When a card is trashed from your deck, delete an opposing level 3 Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (!host) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDiscardLibrary",
              sourcePermanentId: host.permanentId,
              once: false,
              description: `${cardId}: deck trashed`,
              matches: (subCtx) => subCtx.trigger.addedToHand?.byEffect?.ownerSeat === source.ownerSeat,
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const candidates = subCtx.game
                  .player(opponent)
                  .battleArea.filter(
                    (permanent) =>
                      permanent.topCard !== undefined &&
                      isDigimon(subCtx.game.definitionOf(permanent.topCard)) &&
                      subCtx.game.definitionOf(permanent.topCard).level === 3,
                  )
                  .map(({ permanentId }) => permanentId);
                if (!candidates.length) return;
                const [picked] =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                if (picked) await subCtx.fx.deletePermanent([picked]);
              },
            });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
