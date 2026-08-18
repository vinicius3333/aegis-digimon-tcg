import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-100";
const RASENMON = "Rasenmon";

function securityCount(game: GameAccess, source: CardSource): number {
  return game.player(source.ownerSeat).security.length;
}

function rasenmonCandidates(game: GameAccess, source: CardSource): Permanent[] {
  return game.player(source.ownerSeat).battleArea.filter((p) => {
    if (p.topCard === undefined) return false;
    const def: CardDefinition = game.definitionOf(p.topCard);
    return def.nameEn.includes(RASENMON);
  });
}

function opponentDigimonCandidates(game: GameAccess, source: CardSource): Permanent[] {
  const opponentSeat = game.opponentOf(source.ownerSeat);
  return game.player(opponentSeat).battleArea.filter((p) => {
    if (p.topCard === undefined) return false;
    return isDigimon(game.definitionOf(p.topCard));
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Static: play cost = number of cards in owner's security stack.
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/play-cost-equals-security-count`,
          description:
            "When using this card from your hand, its memory cost is equal to the number " +
            "of cards in your security stack.",
          when: (ctx) => {
            const hand = ctx.game.player(ctx.source.ownerSeat).hand;
            return hand.some((c) => c.instanceId === ctx.source.instanceId);
          },
          resolve: async (ctx) => {
            const n = securityCount(ctx.game, source);
            ctx.fx.changePlayCost(
              (facts) => facts.controllerSeat === ctx.source.ownerSeat,
              n,
              { setFixed: true },
            );
          },
        }),
      ];
    }

    // [Security] Add this card to its owner's hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    // [Main] -3000 DP to 1 opponent Digimon; +1 Security Attack to 1 own Rasenmon.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-dp-minus-security-attack-plus`,
          description:
            "[Main] 1 of your opponent's Digimon gets -3000 DP for the turn. Then, " +
            "1 of your [Rasenmon] gains <Security Attack +1> for the turn.",
          optional: false,
          resolve: async (ctx) => {
            // Step 1: -3000 DP to 1 opponent Digimon (mandatory)
            const opponents = opponentDigimonCandidates(ctx.game, source);
            if (opponents.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: opponents.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              for (const id of chosen) {
                ctx.fx.modifyDP(id, -3000, EffectDuration.UntilEachTurnEnd);
              }
            }

            // Step 2: +1 Security Attack to 1 own Rasenmon (only if one is in play — Q1668)
            const rasenmons = rasenmonCandidates(ctx.game, source);
            if (rasenmons.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: rasenmons.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              for (const id of chosen) {
                ctx.fx.grantKeyword(id, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
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
