import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-010";

function isLegendArmsOrLevel6(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.level === 6) return true;
  return (def.types ?? []).includes("Legend-Arms");
}

/** The owner's battle-area Digimon eligible to receive this card as a digivolution card. */
function eligiblePlacementTargets(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea)
    .filter((p) => !p.inBreeding && p.topCard !== undefined && isLegendArmsOrLevel6(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Hand] [Main] By paying 3 cost and placing this card as the bottom digivolution card
    // of 1 of your Digimon that's level 6 or has the [Legend-Arms] trait, delete 1 of your
    // opponent's Digimon with as much or less DP as that Digimon.
    // KB Q3704: activation requires BOTH the cost AND a legal placement target.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-and-delete`,
          description:
            "[Hand] [Main] By paying 3 cost and placing this card as the bottom digivolution " +
            "card of 1 of your Digimon that's level 6 or has the [Legend-Arms] trait, delete " +
            "1 of your opponent's Digimon with as much or less DP as that Digimon.",
          // `isFromHand` base guard requires actual hand residency.
          isFromHand: true,
          canActivate: (ctx) => eligiblePlacementTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = eligiblePlacementTargets(ctx, source);
            if (targets.length === 0) return;

            let targetId: string;
            if (targets.length === 1) {
              targetId = targets[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length === 0) return;
              targetId = chosen[0]!;
            }

            ctx.fx.gainMemory(-3); // cost: pay 3
            await ctx.fx.placeUnder(targetId, [ctx.source.instanceId]);

            const target = ctx.game.permanentById(targetId);
            if (target === undefined) return;
            const targetDP = target.currentDP;

            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const eligibleVictims = Array.from(opponent.battleArea).filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= targetDP,
            );
            if (eligibleVictims.length === 0) return;

            const chosenVictim = await ctx.ask.chooseTargets(ctx, {
              candidates: eligibleVictims.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenVictim.length > 0) {
              await ctx.fx.deletePermanent(chosenVictim);
            }
          },
        }),
      ];
    }

    // [When Digivolving] 1 of your Digimon may attack (KB Q3705: must be legally attackable).
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-attack`,
          description: "[When Digivolving] 1 of your Digimon may attack.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(player.battleArea)
              .filter(
                (p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon),
              )
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.forceAttack(chosen[0]!);
          },
        }),
      ];
    }

    // [Your Turn] [Inherited] When the host Digimon is [RagnaLoardmon] and it is the
    // attacker, [Security] effects on cards it checks don't activate.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-ragnaloardmon-disable-security`,
          description:
            "[Your Turn] [Inherited] When this Digimon is [RagnaLoardmon] and is attacking, " +
            "the [Security] effects on cards it checks don't activate.",
          isInherited: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            const topDef = ctx.game.definitionOf(perm.topCard);
            // Gate: top card name must contain "RagnaLoardmon".
            return topDef.nameEn.includes("RagnaLoardmon");
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            ctx.fx.disableSecurityEffect(perm.permanentId, "any", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
