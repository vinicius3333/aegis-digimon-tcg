import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX8-012 — Growlmon (X Antibody) (EX8, Red Lv.6 Digimon).
 *
 * [When Digivolving] Draw 1 card, then trash 1 card from your hand. Then, if
 * [Growlmon] or [X Antibody] is in this Digimon's digivolution cards, until the
 * end of your opponent's turn, this Digimon gains "[On Deletion] You may play 1
 * card with [Guilmon] in its name from your trash without paying the cost."
 *
 * Inherited [Your Turn] (Once Per Turn): When any of your opponent's Digimon is
 * deleted, gain 1 memory.
 *
 * KB Q3875: this inherited effect cannot activate if the host permanent and the
 *   opponent's deleted Digimon are deleted at the same timing (both already gone
 *   by the time the trigger would resolve — `isOnBattleArea()`'s base guard already
 *   covers this since the host must still be on the field to react).
 *
 * The conditional [On Deletion] grant is now implemented: after the draw/trash
 * body, `self.stack` (the digivolution cards under this permanent) is checked for
 * a [Growlmon]-named card or one carrying the [X Antibody] trait; if found, a
 * one-shot `onDeletionOf` watcher (EX6-068/BT26-095 precedent) is installed on
 * this permanent, expiring at the end of the opponent's turn.
 *
 * Digivolution requirement (Growlmon → cost 0) lives in effects.json and is read
 * by `digivolutionRequirementsFor` independently of this module.
 */
const cardId = "EX8-012";

function hasGrowlmonOrXAntibody(def: CardDefinition): boolean {
  return def.nameEn.includes("Growlmon") || (def.types ?? []).includes("X Antibody");
}

function isGuilmonNamed(def: CardDefinition): boolean {
  return def.nameEn.includes("Guilmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Draw 1, then trash 1 from hand, then (conditionally)
    // grant the temporary [On Deletion] reaction — see the module header.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-trash`,
          description:
            "[When Digivolving] Draw 1 card, then trash 1 card from your hand.",
          optional: false,
          resolve: async (ctx: EffectContext) => {
            const ownerSeat = source.ownerSeat;
            await ctx.fx.draw(ownerSeat, 1);
            const owner = ctx.game.player(ownerSeat);
            const handIds = owner.hand.map((c) => c.instanceId);
            if (handIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: handIds,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen);
              }
            }

            // "Then, if [Growlmon] or [X Antibody] is in this Digimon's digivolution
            // cards, until the end of your opponent's turn, this Digimon gains
            // '[On Deletion] You may play 1 card with [Guilmon] in its name from your
            // trash without paying the cost.'"
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const qualifies = self.stack.some((c) =>
              hasGrowlmonOrXAntibody(ctx.game.definitionOf(c)),
            );
            if (!qualifies) return;

            const selfPermanentId = self.permanentId;
            const opponentSeat = ctx.game.opponentOf(ownerSeat);

            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: selfPermanentId,
              once: true,
              expiresOnTurnEndOf: opponentSeat,
              description:
                `${cardId}: granted "[On Deletion] You may play 1 [Guilmon] card from ` +
                "your trash without paying the cost.\"",
              matches: (subCtx) => subCtx.trigger?.subjectPermanentId === selfPermanentId,
              run: async (subCtx) => {
                const currentOwner = subCtx.game.player(ownerSeat);
                const candidates = currentOwner.trash
                  .filter((c) => isGuilmonNamed(subCtx.game.definitionOf(c)))
                  .map((c) => c.instanceId);
                if (candidates.length === 0) return;

                const willActivate = await subCtx.ask.optional(
                  subCtx,
                  "Play 1 card with [Guilmon] in its name from your trash without paying " +
                    "the cost?",
                );
                if (!willActivate) return;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates,
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
                }
              },
            });
          },
        }),
      ];
    }

    // Inherited [Your Turn] (Once Per Turn): When any of your opponent's Digimon
    // is deleted, gain 1 memory.
    // Guard: source on battle area + owner's turn + deleted set contains an
    // opponent-owned Digimon (checked via opponent's trash).
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-your-turn-opponent-deleted-gain-memory`,
          description:
            "[Your Turn] (Once Per Turn) When any of your opponent's Digimon is deleted, " +
            "gain 1 memory.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx: EffectContext) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const deletedIds = ctx.trigger?.deletedInstanceIds;
            if (!deletedIds || deletedIds.length === 0) return false;
            // The deleted cards are now in the opponent's trash — check that at
            // least one is an opponent Digimon.
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponentTrash = ctx.game.player(opponentSeat).trash;
            return opponentTrash.some(
              (c) =>
                deletedIds.includes(c.instanceId) &&
                isDigimon(ctx.game.definitionOf(c)),
            );
          },
          resolve: async (ctx: EffectContext) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
