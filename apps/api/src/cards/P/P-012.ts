import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-012";

function hasVeedramon(def: CardDefinition): boolean {
  return def.nameEn.includes("Veedramon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // A Tamer's own explicit [Main] ability is a player-activated ability, fired via
    // the activateEffect verb at EffectTiming.OnDeclaration (see card-module contract
    // section 4) — NOT EffectTiming.OnUseOption, which is reserved for an Option
    // card's [Main] body fired by play-card (see builders.ts `activated` doc comment).
    // Q4123: activatable any time in the main phase (not an interrupt).
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] If you have a Digimon with [Veedramon] in its name in play, by suspending " +
            "this Tamer, ＜Draw 1＞ or 1 of your Digimon gets +1000 DP for the turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.battleArea).some(
              (p) => p.topCard !== undefined && hasVeedramon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            // Pay the suspend cost before resolving the chosen branch.
            await ctx.fx.suspend([self.permanentId]);
            const owner = ctx.game.player(source.ownerSeat);
            const choice = await ctx.ask.chooseOption(ctx, ["Draw 1", "+1000 DP to a Digimon"]);
            if (choice === 0) {
              ctx.fx.draw(source.ownerSeat, 1);
            } else {
              const targets = Array.from(owner.battleArea)
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                .map((p) => p.permanentId);
              if (targets.length > 0) {
                const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
                if (chosen.length > 0) {
                  ctx.fx.modifyDP(chosen[0]!, 1000, EffectDuration.UntilEachTurnEnd);
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
