import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-064";

function isVortexWarriors(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Vortex Warriors");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description:
            "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opponent).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // Tamer's owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-grant-keywords`,
          description:
            "[End of Your Turn] By suspending this Tamer, 1 of your Digimon gains " +
            "＜Piercing＞ and ＜Blocker＞ until the end of your opponent's turn. If that " +
            "Digimon has the [Vortex Warriors] trait, unsuspend it.",
          optional: true,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => {
            const self = source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const selfPerm = source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            const targetId = chosen[0]!;
            ctx.fx.grantKeyword(targetId, "Piercing", EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.grantKeyword(targetId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
            const target = ctx.game.permanentById(targetId);
            if (target !== undefined && target.topCard !== undefined) {
              const def = ctx.game.definitionOf(target.topCard);
              if (isVortexWarriors(def)) {
                ctx.fx.unsuspend([targetId]);
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
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its memory cost.",
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
