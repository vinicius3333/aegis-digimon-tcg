import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "EX1-020";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn][Once Per Turn] When one of your opponent's Digimon's digivolution
    // cards is trashed, <Draw 2>.
    // Modeled: turnTiming installs a one-shot SubTrigger on whenDigivolutionTrashed
    // each turn. maxPerTurn: 1 limits re-installation to once per turn.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-install-draw2-on-oppo-divi-trashed`,
          description:
            "[Your Turn][Once Per Turn] When one of your opponent's Digimon's digivolution " +
            "cards is trashed, <Draw 2>.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            const ownerSeat = ctx.source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self?.permanentId,
              once: true,
              expiresOnTurnEndOf: ownerSeat,
              description: `${cardId}: draw 2 when opponent's digivolution card trashed`,
              matches: (subCtx) => {
                // Must be owner's turn and source must still be on battle area
                if (!subCtx.source.isOwnersTurn()) return false;
                // The subject is the host Digimon that lost a digivolution card —
                // it must be an opponent's battle-area Digimon.
                const subjectId = subCtx.trigger.subjectPermanentId;
                if (subjectId === undefined) return false;
                const perm = subCtx.game.permanentById(subjectId);
                if (perm === undefined || perm.topCard === undefined) return false;
                // Host must be an opponent's Digimon
                if (perm.controllerSeat === ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(perm.topCard));
              },
              run: async (subCtx) => {
                await subCtx.fx.draw(ownerSeat, 2);
              },
            });
          },
        }),
      ];
    }

    // [Your Turn] Static: this Digimon can also attack opponent's unsuspended Digimon
    // IsExistOnBattleArea && IsOwnerTurn. Defense condition: !IsSuspended && HasNoDigivolutionCards.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/can-attack-unsuspended-no-divi`,
          description:
            "[Your Turn] This Digimon can attack your opponent's unsuspended Digimon " +
            "with no digivolution cards.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantCanAttackUnsuspended(
              self.permanentId,
              EffectDuration.UntilOwnerTurnEnd,
              { noDigivolutionCards: true },
            );
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
