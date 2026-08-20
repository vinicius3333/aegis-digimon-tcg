import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import {
  whenDigivolving,
  whenAttacking,
  staticModifier,
  activated,
  colorWaiverStatic,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX12-052";
const sharedDpBattleEffectKey = `${cardId}/once-per-turn-dp-battle`;

function hasNSp(def: CardDefinition): boolean {
  return (def.types ?? []).includes("NSp");
}

/** §16-42-1 gate for ＜Use Req. ([NSp] trait)＞: controller has an [NSp] trait card in play. */
function hasNSpInPlay(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.some((p) => p.topCard !== undefined && hasNSp(ctx.game.definitionOf(p.topCard)));
}

async function dpBoostAndBattle(
  ctx: Parameters<NonNullable<Parameters<typeof whenDigivolving>[0]["resolve"]>>[0],
  source: CardSource,
): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const myDigimon = Array.from(owner.battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
  if (myDigimon.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: myDigimon.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;
  ctx.fx.modifyDP(chosen[0]!, 3000, EffectDuration.UntilOpponentTurnEnd);
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (oppDigimon.length > 0) {
    const willBattle = await ctx.ask.optional(ctx, "Battle 1 opponent Digimon?");
    if (willBattle) {
      const battleTarget = await ctx.ask.chooseTargets(ctx, {
        candidates: oppDigimon,
        min: 1,
        max: 1,
      });
      if (battleTarget.length > 0 && ctx.fx.forceBattle) {
        await ctx.fx.forceBattle(chosen[0]!, battleTarget[0]!);
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Option side ("Truskmore Advance"): [Main] 1 of your Digimon may unsuspend. Then,
    // suspend 2 of your opponent's Digimon. 2 of their Digimon or Tamers can't unsuspend
    // until their turn ends.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-unsuspend-suspend-lock`,
          description:
            "[Main] 1 of your Digimon may unsuspend. Then, suspend 2 of your opponent's " +
            "Digimon. 2 of their Digimon or Tamers can't unsuspend until their turn ends.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const suspendedOwn = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.isSuspended)
              .map((p) => p.permanentId);
            if (suspendedOwn.length > 0) {
              const wantToUnsuspend = await ctx.ask.optional(ctx, "Unsuspend 1 of your Digimon?");
              if (wantToUnsuspend) {
                const chosen =
                  suspendedOwn.length === 1
                    ? [suspendedOwn[0]!]
                    : await ctx.ask.chooseTargets(ctx, { candidates: suspendedOwn, min: 1, max: 1 });
                if (chosen.length > 0) ctx.fx.unsuspend(chosen);
              }
            }

            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const unsuspendedOppDigimon = Array.from(opponent.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended)
              .map((p) => p.permanentId);
            if (unsuspendedOppDigimon.length > 0) {
              const toSuspend = await ctx.ask.chooseTargets(ctx, {
                candidates: unsuspendedOppDigimon,
                min: 0,
                max: Math.min(2, unsuspendedOppDigimon.length),
              });
              if (toSuspend.length > 0) await ctx.fx.suspend(toSuspend);
            }

            const oppDigimonOrTamers = Array.from(opponent.battleArea)
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) || (def.kinds as string[]).includes("Tamer");
              })
              .map((p) => p.permanentId);
            if (oppDigimonOrTamers.length > 0) {
              const locked = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimonOrTamers,
                min: 0,
                max: Math.min(2, oppDigimonOrTamers.length),
              });
              for (const permanentId of locked) {
                ctx.fx.restrict(permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
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
          effectKey: `${cardId}/when-digivolving-immune`,
          description:
            "[When Digivolving] [Once Per Turn] Your opponent's Digimon effects don't affect " +
            "1 of your Digimon until their turn ends.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const myDigimon = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (myDigimon.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: myDigimon, min: 1, max: 1 });
            if (chosen.length > 0) {
              ctx.fx.restrict(chosen[0]!, "beAffected", EffectDuration.UntilOpponentTurnEnd, { fromSourceKind: ["Digimon"] });
            }
          },
        }),
        whenDigivolving({
          source,
          effectKey: sharedDpBattleEffectKey,
          description:
            "[When Digivolving] [Once Per Turn] 1 of your Digimon gets +3000 DP until your " +
            "opponent's turn ends. Then, you may battle 1 opponent Digimon with that Digimon.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await dpBoostAndBattle(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: sharedDpBattleEffectKey,
          description:
            "[When Attacking] [Once Per Turn] 1 of your Digimon gets +3000 DP until your " +
            "opponent's turn ends. Then, you may battle 1 opponent Digimon with that Digimon.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await dpBoostAndBattle(ctx, source);
          },
        }),
      ];
    }

    // [Counter] [Once Per Turn]: same ability, activatable by the non-turn (defending)
    // player during §11-3 Counter Timing (engine/actions/counter.ts's COUNTER_TIMING
    // window). No dedicated `counter` builder exists yet — `activated`'s baseGuard is
    // already permissive (no on-field requirement baked in beyond the card's own
    // `canActivate`), and `respondCounter` only cares about `effectsOf(OnCounterTiming, ...)`
    // returning a usable Effect, not which builder produced it.
    if (timing === EffectTiming.OnCounterTiming) {
      return [
        activated({
          source,
          effectKey: sharedDpBattleEffectKey,
          description:
            "[Counter] [Once Per Turn] 1 of your Digimon gets +3000 DP until your " +
            "opponent's turn ends. Then, you may battle 1 opponent Digimon with that Digimon.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await dpBoostAndBattle(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/vortex`,
          description: "＜Vortex＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Vortex", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        // Option side ＜Use Req. ([NSp] trait)＞: ignore the Option's color requirement
        // while controlling an [NSp] trait card in play (§16-42-1).
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-nsp`,
          description: "＜Use Req. ([NSp] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => hasNSpInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
