import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-026";

function isGuilmon(def: CardDefinition): boolean {
  return def.nameEn === "Guilmon" || def.nameEn.includes("Guilmon");
}

function isGrowlmon(def: CardDefinition): boolean {
  return def.nameEn === "Growlmon" || def.nameEn.includes("Growlmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "[On Play] Delete 1 of your opponent's Digimon with 11000 DP or less.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return (def.dp ?? 0) <= 11000;
              })
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "[When Digivolving] Delete 1 of your opponent's Digimon with 11000 DP or less.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return (def.dp ?? 0) <= 11000;
              })
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/leave-play-replacement`,
          description:
            "[All Turns] When this Digimon would leave the battle area, play 1 [Guilmon] from " +
            "this Digimon's digivolution cards or your trash without paying the cost, and place " +
            "this Digimon under that [Guilmon].",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (/*ctx*/) => {
            // ENGINE-GAP: wouldLeavePlay is a ReplacementEvent, not a SubTrigger;
            // the "when would leave, play Guilmon from stack/trash and place under"
            // pattern requires a subscribeReplacement instead-of action.
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherit-name-chaosgallantmon`,
          description: "This Digimon's name is also treated as [ChaosGallantmon].",
          isInherited: false,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantNameTrait(self.permanentId, "name", ["ChaosGallantmon"], EffectDuration.Permanent);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherit-security-attack`,
          description:
            "[All Turns] [Inherited] This Digimon gains ＜Security Attack +1＞ for each 5000 DP it has.",
          isInherited: true,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              const def = ctx.game.definitionOf(self.topCard);
              if (def && isDigimon(def)) {
                const bonusSA = Math.floor((def.dp ?? 0) / 5000);
                if (bonusSA > 0) {
                  ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, bonusSA);
                }
              }
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
