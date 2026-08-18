import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT2-097";

/** Opponent battle-area level-3 Digimon (the -4000 DP targets). */
const opponentLevel3Digimon = (ctx: EffectContext, source: CardSource): string[] => {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  return Array.from(opponent.battleArea)
    .filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      const def: CardDefinition = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(def) && def.level === 3;
    })
    .map((permanent) => permanent.permanentId);
};

/** Shared [Main] body: select up to 3 opponent level-3 Digimon and give each -4000 DP for the turn. */
const resolveMain = async (ctx: EffectContext, source: CardSource): Promise<void> => {
  const candidates = opponentLevel3Digimon(ctx, source);
  if (candidates.length === 0) return;
  const maxCount = Math.min(3, candidates.length);
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates,
    min: maxCount,
    max: maxCount,
  });
  for (const permanentId of chosen) {
    ctx.fx.modifyDP(permanentId, -4000, EffectDuration.UntilEachTurnEnd);
  }
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] 3 of your opponent's level 3 Digimon get -4000 DP for the turn.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-opponent-level3-dp-minus-4000`,
          description: "[Main] 3 of your opponent's level 3 Digimon get -4000 DP for the turn.",
          optional: false,
          canActivate: (ctx) => opponentLevel3Digimon(ctx, source).length > 0,
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
