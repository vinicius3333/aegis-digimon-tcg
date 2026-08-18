import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT15-033 — Shellmon (BT15, Blue Digimon).
 *
 *
 * Printed text (no errata):
 *   [Inherited][All Turns] When this Digimon would be deleted in battle, by trashing
 *   the top card of your security stack, prevent that deletion.
 *
 * This is a Continuous/Replacement effect: intercepts deletion-by-battle events.
 */
const cardId = "BT15-033";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Inherited][All Turns] Prevent deletion in battle by trashing top security.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-battle-deletion`,
          description:
            "[All Turns] When this Digimon would be deleted in battle, by trashing " +
            "the top card of your security stack, prevent that deletion.",
          optional: false,
          isInherited: true,
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              sourcePermanentId: me.permanentId,
              mode: "prevent",
              description:
                "[All Turns] By trashing the top card of your security stack, prevent this Digimon's deletion in battle.",
              causeAllows: (cause) => cause === "byBattle",
              protects: (_subCtx, leavingId) => leavingId === me.permanentId,
              preventCheck: async (subCtx, leavingId) => {
                if (leavingId !== me.permanentId) return false;
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.security.length === 0) return false;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Trash the top card of your security stack to prevent this deletion?",
                );
                if (!yes) return false;
                await subCtx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
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
