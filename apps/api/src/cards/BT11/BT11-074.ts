import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-074";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/reboot`,
        description: "Reboot.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/redirect-and-delete`,
        description: "Opponent-turn attack redirect and unsuspend deletion watchers.",
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenOpponentAttacks",
            sourcePermanentId: self.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/redirect`,
            description: "BT11-074 redirect",
            matches: (subCtx) => {
              const attacker =
                subCtx.trigger.attackerPermanentId === undefined
                  ? undefined
                  : subCtx.game.permanentById(subCtx.trigger.attackerPermanentId);
              if (attacker === undefined) return false;
              const opposing = subCtx.game
                .player(subCtx.game.opponentOf(source.ownerSeat))
                .battleArea.filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)));
              return attacker.currentDP === Math.max(...opposing.map((p) => p.currentDP));
            },
            run: async (subCtx) => {
              await subCtx.fx.redirectAttack([self.permanentId], { optional: true });
            },
          });
          ctx.fx.subscribeSubTrigger({
            event: "whenUnsuspended",
            sourcePermanentId: self.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/delete`,
            description: "BT11-074 delete",
            matches: (subCtx) =>
              !source.isOwnersTurn() &&
              (subCtx.game
                .permanentById(self.permanentId)
                ?.stack.some((card) =>
                  ["blackwargreymon", "x antibody"].some((n) =>
                    subCtx.game.definitionOf(card).nameEn.toLowerCase().includes(n),
                  ),
                ) ??
                false),
            run: async (subCtx) => {
              const enemies = subCtx.game
                .player(subCtx.game.opponentOf(source.ownerSeat))
                .battleArea.filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)));
              if (enemies.length === 0) return;
              const lowest = Math.min(...enemies.map((p) => subCtx.game.definitionOf(p.topCard!).playCost ?? 99));
              const choices = enemies
                .filter((p) => (subCtx.game.definitionOf(p.topCard!).playCost ?? 99) === lowest)
                .map(({ permanentId }) => permanentId);
              const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates: choices, min: 0, max: 1 });
              if (chosen.length > 0) await subCtx.fx.deletePermanent(chosen, "byEffect");
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
