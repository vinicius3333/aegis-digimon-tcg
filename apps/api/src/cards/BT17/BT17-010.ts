import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Growlmon (BT17-010, Red Lv.4 Digimon).
//
// Hand-written override of the declarative effect record. The declarative effect record was BROKEN for the
// main clause: it encoded the "if this effect didn't delete" gate as a raw
// Condition, and the interpreter treats every raw Condition as UNMET
// (interpreter.ts evaluateCondition: `case "raw": return false`), so the +3000 DP
// branch could never fire. This module evaluates the gate against real board state.
//
// KB (authoritative — `tools/kb/query.mjs card BT17-010`): no errata; bound rulings:
//   - Q2718: the deletion is MANDATORY. With a valid target you must choose one;
//     you cannot decline in order to take the +3000 DP instead.
//   - Q2719: you MAY target an opponent Digimon that has "can't be deleted by your
//     opponent's effects". If the deletion is then prevented, the effect "didn't
//     delete", so this Digimon gets +3000 DP. Hence "didn't delete" is decided by
//     whether a Digimon was ACTUALLY removed, not by whether a target was chosen.
const cardId = "BT17-010";

// Opponent battle-area Digimon (source IsPermanentExistsOnOpponentBattleAreaDigimon).
const isOpponentBattleAreaDigimon = (
  ctx: EffectContext,
  source: CardSource,
  permanent: Permanent,
): boolean => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  if (permanent.controllerSeat !== opponent || permanent.topCard === undefined) return false;
  return isDigimon(ctx.game.definitionOf(permanent.topCard));
};

// Opponent Digimon with 4000 DP or less (source condition `permanent.DP <= 4000`).
//
// NOTE: the source threshold is `card.Owner.MaxDP_DeleteEffect(4000, ...)`, which the
// inherited ESS clause below can raise to 6000 while this card's controller has 0 or
// less memory. That maximum-raising mechanic is NOT modeled by the engine yet (see the
// EffectTiming.None clause), so this uses the printed 4000 threshold. When a
// DP-deletion-maximum subsystem lands, this bound must read it.
const deletionCandidates = (ctx: EffectContext, source: CardSource): Permanent[] =>
  Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea).filter(
    (permanent) =>
      isOpponentBattleAreaDigimon(ctx, source, permanent) && permanent.currentDP <= 4000,
  );

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less.
    // If this effect didn't delete, this Digimon gets +3000 DP for the turn.
    //   rule implementation selects 1 target (mandatory, maxCount = min(1, matches)), deletes
    //   it via DeletePeremanentAndProcessAccordingToResult, and on FAILURE (nothing
    //   deleted) runs ChangeDigimonDP(+3000, UntilEachTurnEnd) on this Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-or-dp`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less. " +
            "If this effect didn't delete, this Digimon gets +3000 DP for the turn.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = deletionCandidates(ctx, source);

            // The deletion is mandatory whenever a valid target exists (KB Q2718); the
            // controller chooses which one (a deletion-immune target is a legal choice,
            // KB Q2719). Decisions are keyed by the candidate's top-card instance id.
            let deletedSomething = false;
            if (candidates.length > 0) {
              const byTopCard = new Map<string, Permanent>(
                candidates.map((permanent) => [permanent.topCard!.instanceId, permanent]),
              );
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: Array.from(byTopCard.keys()),
                min: 1,
                max: 1,
              });
              const chosenPermanent =
                chosen[0] === undefined ? undefined : byTopCard.get(chosen[0]);
              if (chosenPermanent !== undefined) {
                const { permanentId } = chosenPermanent;
                await ctx.fx.deletePermanent([permanentId]);
                // "Didn't delete" is decided by the board, not the selection: a target
                // protected by "can't be deleted by your opponent's effects" survives,
                // so the effect didn't delete and the +3000 DP applies (KB Q2719).
                deletedSomething = ctx.game.permanentById(permanentId) === undefined;
              }
            }

            if (!deletedSomething) {
              const self = ctx.source.permanent();
              if (self !== undefined) {
                ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      ];
    }

    // Inherited ESS — [Your Turn] While you have 0 or less memory, add 2000 to the
    // maximum your DP-based deletion effects can delete.
    //   SetIsInheritedEffect(true), gated on this card's controller having <= 0 memory.
    //
    // BLOCKED (represented, not faked — card-module contract): the engine has no
    // "DP-based deletion maximum" modifier. There is no field on ModifierLedger or
    // ContinuousEffectLedger for it, no Primitives verb to register it, and — decisively
    // — no CONSUMER: the only place a DP threshold is read for deletion is the per-card /
    // interpreter target filter (a fixed `currentDP <= N`), which never consults a
    // raised maximum. Wiring this needs a shared-engine change (a deletion-maximum store
    // + reading it in every DP-based delete bound), which is out of scope for this
    // per-card fan-out (parallel-unsafe: no new shared IR kinds / shared-engine edits).
    // KB Q2721/Q2722 fix its exact behavior for when it lands: it raises the numeric
    // maximum shown by a DP-based deletion effect (e.g. "4000 or less" -> "6000 or less"),
    // but NOT effects whose threshold references a Digimon's DP rather than a printed
    // number. The sibling card BT17-008 leaves this same clause in its IR `residual`.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/dp-delete-maximum-plus-2000`,
          description:
            "[Your Turn] While you have 0 or less memory, add 2000 to the maximum your " +
            "DP-based deletion effects can delete.",
          optional: false,
          isInherited: true,
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            ctx.game.state.memory <= 0,
          resolve: async () => {
            // BLOCKED: needs a DP-based-deletion-maximum subsystem (store + consumer in
            // the delete bound). See the clause header; no existing primitive expresses it.
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
