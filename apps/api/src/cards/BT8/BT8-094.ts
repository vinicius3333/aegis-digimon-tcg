// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT8-094 — Digimon Emperor (BT8, White Tamer).
 *
 *
 * Printed text (no errata):
 *   [All Turns] When one of your opponent's level 5 or lower Digimon is deleted,
 *   you may suspend this Tamer to ＜Draw 1＞.
 *   [Opponent's Turn] When one of your opponent's level 3 Digimon is moved from
 *   their breeding area to their battle area, gain 2 memory.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT8-094";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns] When opponent's Lv≤5 Digimon is deleted, suspend this Tamer
    // to ＜Draw 1＞.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-deletion-draw`,
          description:
            "[All Turns] When one of your opponent's level 5 or lower Digimon is deleted, " +
            "you may suspend this Tamer to ＜Draw 1＞.",
          optional: true,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const deleted = ctx.trigger?.deletedInstanceIds;
            if (deleted === undefined) return false;
            const stackCards = new Set(ctx.trigger?.deletedWasStackInstanceIds ?? []);
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponentTrash = ctx.game.player(oppSeat).trash;
            return opponentTrash.some((card) => {
              if (!deleted.includes(card.instanceId) || stackCards.has(card.instanceId)) return false;
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && def.level !== undefined && def.level <= 5;
            });
          },
          canActivate: (ctx) => {
            const me = source.permanent();
            if (me === undefined || me.isSuspended) return false;
            return ctx.game.player(source.ownerSeat).deck.length >= 1;
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            const paid = ctx.fx.payActivationCost?.(me.permanentId, "suspend");
            if (paid === false) return;
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // [Opponent's Turn] When opponent's Lv3 Digimon moves from breeding to battle,
    // gain 2 memory.
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-move-memory`,
          description:
            "[Opponent's Turn] When one of your opponent's level 3 Digimon is moved from " +
            "their breeding area to their battle area, gain 2 memory.",
          optional: false,
          when: (ctx) => {
            if (!source.isOnBattleArea() || source.isOwnersTurn()) return false;
            const movedId = ctx.trigger?.movedPermanentId;
            if (movedId === undefined) return false;
            const perm = ctx.game.permanentById(movedId);
            if (perm === undefined || perm.topCard === undefined) return false;
            const def = ctx.game.definitionOf(perm.topCard);
            return (
              isDigimon(def) &&
              (def as any).level === 3 &&
              perm.controllerSeat === ctx.game.opponentOf(source.ownerSeat)
            );
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(2);
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
