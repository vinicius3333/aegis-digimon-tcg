import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-061";

/**
 * EX6-061 — EX6 Purple Digimon.
 *
 * [All Turns] [Once Per Turn] When an opponent's Digimon or one of your 7GDL
 * Digimon is played: by trashing 1 hand card, return bottom 3 digivolution cards
 * of 1 opp Digimon to BOTTOM of deck. Then, if opp permanents <= yours, delete
 * 1 opp Digimon with no digivolution cards.
 *
 * [All Turns] When this Digimon would leave battle area (not by battle):
 * place 1 [Seven Great Demon Lords] from trash as bottom digivolution card of
 * your breeding-area [Gate of Deadly Sins].
 */

function opponentHasNoSourceDigimon(ctx: EffectContext): string[] {
  const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const opp = ctx.game.player(oppSeat);
  return opp.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return def.kinds.includes(CardKind.Digimon) && p.stack.length === 0;
    })
    .map((p) => p.permanentId);
}

function opponentTotalPermanents(game: EffectContext["game"], oppSeat: Seat): number {
  const opp = game.player(oppSeat);
  return opp.battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = game.definitionOf(p.topCard);
    return def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Tamer);
  }).length;
}

function ownerTotalPermanents(game: EffectContext["game"], ownerSeat: Seat): number {
  const owner = game.player(ownerSeat);
  return owner.battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = game.definitionOf(p.topCard);
    return def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Tamer);
  }).length;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns] [Once Per Turn] When a Digimon is played...
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-played-digimon-de-digivolve-delete`,
          description:
            "[All Turns] [Once Per Turn] When an opponent's Digimon or one of your " +
            "Digimon with [Seven Great Demon Lords] trait is played, by trashing 1 card " +
            "in your hand, return the bottom 3 digivolution cards of 1 of your opponent's " +
            "Digimon to the bottom of the deck. Then, if your opponent has as many or less " +
            "total Digimon and Tamers as you, delete 1 of your opponent's Digimon with no " +
            "digivolution cards.",
          maxPerTurn: 1,
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!def.kinds.includes(CardKind.Digimon)) return false;

            if (subject.controllerSeat !== ctx.source.ownerSeat) return true; // opponent's Digimon
            const traits = (def.types ?? []).filter((t): t is string => typeof t === "string");
            return traits.includes("Seven Great Demon Lords") || traits.includes("SevenGreatDemonLords");
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.length > 0;
          },
          resolve: async (ctx) => {
            const ownerSeat = ctx.source.ownerSeat;
            const owner = ctx.game.player(ownerSeat);

            // Cost: trash 1 card from hand
            const handIds = owner.hand.map((c) => c.instanceId);
            if (handIds.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: handIds,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.trash(chosen);

            // Select 1 opponent Digimon to return bottom 3 digivolution cards to deck bottom
            const oppSeat = ctx.game.opponentOf(ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const oppDigimonIds = opp.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
              })
              .map((p) => p.permanentId);

            if (oppDigimonIds.length > 0) {
              const chosenPermIds = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimonIds,
                min: 1,
                max: 1,
              });

              if (chosenPermIds.length > 0) {
                const targetPerm = ctx.game.permanentById(chosenPermIds[0]!);
                if (targetPerm !== undefined && targetPerm.stack.length > 0) {
                  // Collect bottom 3 digivolution cards
                  const toReturn: string[] = [];
                  for (let i = 0; i < 3; i++) {
                    // from bottom: index = stack.length - 1 - i
                    const idx = targetPerm.stack.length - 1 - i;
                    if (idx >= 0 && targetPerm.stack[idx] !== undefined) {
                      toReturn.push(targetPerm.stack[idx]!.instanceId);
                    }
                  }

                  // Return to deck BOTTOM
                  // NOT trash! remove from stack and send to deck bottom
                  if (toReturn.length > 0) {
                    await ctx.fx.returnToDeck(toReturn, { toTop: false });
                  }
                }
              }
            }

            // Delete gate: if opponent has <= total Digimon+Tamers as you
            //
            const oppTotal = opponentTotalPermanents(ctx.game, oppSeat);
            const ownerTotal = ownerTotalPermanents(ctx.game, ownerSeat);
            if (ownerTotal >= oppTotal) {
              const noSourceIds = opponentHasNoSourceDigimon(ctx);
              if (noSourceIds.length > 0) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: noSourceIds,
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.deletePermanent(chosen, "byEffect");
                }
              }
            }
          },
        }),
      ];
    }

    // [All Turns] When this Digimon would leave battle area (not by battle):
    // place 1 7GDL from trash as bottom digivolution of breeding-area Gate of Deadly Sins
    if (timing === EffectTiming.OnLeaveFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/leave-place-7gdl-under-gate`,
          description:
            "[All Turns] When this Digimon would leave the battle area other than in battle, " +
            "place 1 card with [Seven Great Demon Lord] trait from your trash as the bottom " +
            "digivolution card of one of your [Gate of Deadly Sins] in your breeding area.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // Must be this card leaving
            const leaveId = ctx.trigger.deletedPermanentId;
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined || leaveId !== selfPerm.permanentId) return false;
            return true;
          },
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.trash.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                (def.types ?? []).includes("Seven Great Demon Lords") ||
                (def.types ?? []).includes("SevenGreatDemonLords")
              );
            });
          },
          resolve: async (ctx) => {
            const ownerSeat = ctx.source.ownerSeat;
            const owner = ctx.game.player(ownerSeat);

            // Find 7GDL in trash
            const gdlTrashIds = owner.trash
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (
                  (def.types ?? []).includes("Seven Great Demon Lords") ||
                  (def.types ?? []).includes("SevenGreatDemonLords")
                );
              })
              .map((c) => c.instanceId);

            if (gdlTrashIds.length === 0) return;

            const chosenTrash = await ctx.ask.selectCards(ctx, {
              candidates: gdlTrashIds,
              min: 1,
              max: 1,
            });
            if (chosenTrash.length === 0) return;

            // Find Gate of Deadly Sins in breeding area
            const breeding = owner.breeding;
            if (breeding === undefined || breeding.topCard === undefined) return;
            const breedingDef = ctx.game.definitionOf(breeding.topCard);
            if (
              !breedingDef.nameEn.includes("Gate of Deadly Sins") &&
              !breedingDef.nameEn.includes("GateofDeadlySins")
            ) return;

            // Place as bottom digivolution card
            ctx.fx.placeUnder(breeding.permanentId, chosenTrash, { belowTop: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
