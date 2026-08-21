// @ts-nocheck
import { CardColor, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT10-093 — Yuu Amano (BT10, Purple Tamer).
 *
 *
 * Printed text with the 2022-10-28 erratum applied:
 *   [All Turns][Once Per Turn] When a purple card is placed under this Tamer,
 *   ＜Draw 1＞ and gain 1 memory.
 *   [Your Turn][Once Per Turn] When playing a level 4 or higher Digimon with
 *   [Bagra Army] in its traits, by placing up to 3 purple Digimon from under
 *   your Tamers as digivolution cards, reduce the play cost by 2 per card placed.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT10-093";

function isPurple(def: { colors?: string[] }): boolean {
  return (def.colors as CardColor[] | undefined)?.includes(CardColor.Purple) ?? false;
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns][Once Per Turn] When a purple card is placed under this Tamer,
    // Draw 1 and gain 1 memory.
    if (timing === EffectTiming.None) {
      // A static install (source pattern: EX7-005) — `resolve` merely (re-)installs the
      // SubTrigger watcher on the continuous-recompute pass; it must NOT run the draw/memory
      // body itself (a `None`-timing effect's `resolve` re-runs on every recompute, so doing the
      // gain there fires it dozens of times per turn, ballooning memory to the +10 ceiling). The
      // actual body only runs when a genuine `onAddDigivolutionCards` event fires for THIS Tamer.
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/on-add-divo-draw`,
          description:
            "[All Turns][Once Per Turn] When a purple card is placed under this Tamer, " +
            "＜Draw 1＞ and gain 1 memory.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: Draw 1 + gain 1 memory when a purple card is placed under this Tamer.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined || subjectId !== self.permanentId) return false;
                const perm = subCtx.game.permanentById(subjectId);
                if (perm === undefined) return false;
                return perm.stack.some((c) => isPurple(subCtx.game.definitionOf(c)));
              },
              run: async (subCtx) => {
                // [All Turns]: this can fire on either player's turn, so credit this
                // Tamer's owner explicitly rather than the turn player.
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
                await subCtx.fx.draw(source.ownerSeat, 1);
              },
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
