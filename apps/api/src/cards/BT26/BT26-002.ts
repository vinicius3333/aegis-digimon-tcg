import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-002 — Budmon (BT26, Green In-Training Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-002 as of this port
// (`node tools/kb/query.mjs card BT26-002` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// Inherited Effect:
//   [Your Turn] [Once Per Turn] When effects trash cards from under your Tamers,
//   ＜Draw 1＞
//
// This is a continuous inherited watcher, not a start-turn snapshot: a Digimon that gains
// Budmon as a source after the turn begins must still react later that same turn. The
// physical source instance supplies the once-per-turn identity.

const cardId = "BT26-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/your-turn-draw-on-tamer-divi-trashed`,
        description: "[Your Turn] [Once Per Turn] When effects trash cards from under your Tamers, " + "＜Draw 1＞",
        optional: false,
        isInherited: true,
        when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = ctx.source.permanent();
          const ownerSeat = ctx.source.ownerSeat;

          ctx.fx.subscribeSubTrigger({
            event: "whenDigivolutionTrashed",
            sourcePermanentId: self?.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/your-turn-draw-on-tamer-divi-trashed`,
            description: `${cardId}: draw 1 when a digivolution card is trashed from under one of your Tamers`,
            matches: (subCtx) => {
              if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
              const subjectId = subCtx.trigger.subjectPermanentId;
              if (subjectId === undefined) return false;
              const perm = subCtx.game.permanentById(subjectId);
              if (perm === undefined || perm.topCard === undefined) return false;
              // Host must be one of YOUR Tamers.
              if (perm.controllerSeat !== ownerSeat) return false;
              return subCtx.game.definitionOf(perm.topCard).kinds?.includes(CardKind.Tamer) ?? false;
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
