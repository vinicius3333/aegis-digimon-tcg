import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
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
// Modeled after EX1-020 (same shape: a turnTiming reinstall each of the host's turns,
// maxPerTurn: 1 gating the reinstall, a one-shot subscribeSubTrigger on
// "whenDigivolutionTrashed" expiring at that turn's end). The gate here gathers to
// "your Tamers" (any Tamer you control) rather than EX1-020's "opponent's Digimon",
// and the effect is inherited (isInherited: true) since this card grants the ability
// to whichever Digimon it ends up placed under as digivolution material.

const cardId = "BT26-002";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnStartTurn) return [];

    return [
      turnTiming({
        source,
        effectKey: `${cardId}/your-turn-draw-on-tamer-divi-trashed`,
        description:
          "[Your Turn] [Once Per Turn] When effects trash cards from under your Tamers, " +
          "＜Draw 1＞",
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
            description: `${cardId}: draw 1 when a digivolution card is trashed from under one of your Tamers`,
            matches: (subCtx) => {
              if (!subCtx.source.isOwnersTurn()) return false;
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
