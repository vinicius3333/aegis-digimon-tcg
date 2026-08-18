import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-002 — Gomamon (BT6, Blue Lv.3 Digimon).
 *
 * [Your Turn][Once Per Turn] (inherited) When one of your opponent's digivolution
 * cards is trashed, trigger ＜Draw 1＞.
 *
 * Modeled as a turnTiming effect that installs a `whenDigivolutionTrashed`
 * SubTrigger each turn. maxPerTurn: 1 enforces Once Per Turn.
 */
const cardId = "BT6-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnStartTurn) return [];

    return [
      turnTiming({
        source,
        effectKey: `${cardId}/install-draw-on-opponent-divi-trashed`,
        description:
          "[Your Turn][Once Per Turn] (inherited) When one of your opponent's digivolution cards is trashed, Draw 1.",
        optional: false,
        isInherited: true,
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
            description: `${cardId}: draw 1 when opponent's digivolution card trashed`,
            matches: (subCtx) => {
              if (!subCtx.source.isOwnersTurn()) return false;
              const subjectId = subCtx.trigger.subjectPermanentId;
              if (subjectId === undefined) return false;
              const perm = subCtx.game.permanentById(subjectId);
              if (perm === undefined) return false;
              if (perm.controllerSeat === ownerSeat) return false;
              return isDigimon(subCtx.game.definitionOf(perm.topCard));
            },
            run: async (subCtx) => {
              await subCtx.fx.draw(ownerSeat, 1);
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
