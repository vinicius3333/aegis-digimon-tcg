import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-014";

async function deleteLowestDP(
  ctx: Parameters<NonNullable<Parameters<typeof onPlay>[0]["resolve"]>>[0],
  source: CardSource,
): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
  if (oppDigimon.length === 0) return;
  oppDigimon.sort((a, b) => {
    const defA = ctx.game.definitionOf(a.topCard!);
    const defB = ctx.game.definitionOf(b.topCard!);
    return (defA.dp ?? 0) - (defB.dp ?? 0);
  });
  const lowest = oppDigimon.filter((p) => {
    return (ctx.game.definitionOf(p.topCard!).dp ?? 0) === (ctx.game.definitionOf(oppDigimon[0]!.topCard!).dp ?? 0);
  });
  const candidates = lowest.map((p) => p.permanentId);
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length > 0) {
    await ctx.fx.deletePermanent(chosen);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-lowest-dp`,
          description: "[On Play] Delete 1 of your opponent's Digimon with the lowest DP.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await deleteLowestDP(ctx, source);
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-restrict-play`,
          description:
            "[When Digivolving] Your opponent can't play or move Digimon with 6000 DP or " +
            "less until the end of their turn.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            ctx.fx.restrictPlay(
              opponent,
              source.ownerSeat,
              { kinds: ["Digimon"], dpAtMost: 6000 },
              "playOrMove",
              EffectDuration.UntilOwnerTurnEnd,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-delete-lowest-dp`,
          description: "[When Attacking] Delete 1 of your opponent's Digimon with the lowest DP.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await deleteLowestDP(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/leave-play-from-hand`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other " +
            "than by one of your effects, you may play 1 [Machine Dragon]/[Sky Dragon] trait " +
            "Digimon card from your hand without paying the cost.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/leave-replacement`,
              description: `${cardId}: Play 1 Machine Dragon/Sky Dragon from hand when leaving.`,
              protects: (_subCtx, leavingId) => leavingId === self.permanentId,
              causeAllows: (_cause, resolvingSeat) =>
                !(_cause === "byEffect" && resolvingSeat === ownerSeat),
              preventCheck: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return false;
                const owner = subCtx.game.player(ownerSeat);
                const qualifying = Array.from(owner.hand).filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  if (!isDigimon(def)) return false;
                  return (def.types ?? []).some(
                    (t) => t === "Machine Dragon" || t === "Sky Dragon",
                  );
                });
                if (qualifying.length === 0) return false;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: qualifying.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return false;
                await subCtx.fx.playInstances(chosen, { payCost: false });
                return true;
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
