import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-005";

function opponentDigimonWasDeleted(ctx: EffectContext, source: CardSource): boolean {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const deleted = new Set(ctx.trigger.deletedInstanceIds ?? []);
  return ctx.game.player(opponent).trash.some((instance) =>
    deleted.has(instance.instanceId) && isDigimon(ctx.game.definitionOf(instance))
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];
    return [turnTiming({
      source,
      effectKey: `${cardId}/inherited-opponent-deletion-draw`,
      description:
        "[Opponent's Turn][Once Per Turn] When an opponent's Digimon is deleted, " +
        "if this Digimon has [Greymon] in its name, draw 1.",
      isInherited: true,
      maxPerTurn: 1,
      when: (ctx) => {
        if (!source.isOnBattleArea() || source.isOwnersTurn()) return false;
        const host = source.permanent();
        return host?.topCard !== undefined &&
          matchNameOrTrait(ctx.game.definitionOf(host.topCard), {
            tokens: ["Greymon"],
            match: "name",
          });
      },
      canActivate: (ctx) => opponentDigimonWasDeleted(ctx, source),
      resolve: async (ctx) => {
        await ctx.fx.draw(source.ownerSeat, 1);
      },
    })];
  },
};

registerCard(module);
export default module;
