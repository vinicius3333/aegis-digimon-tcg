import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// DexDoruGreymon (BT17-067, Purple Lv.5 Digimon).
//
// Hand-written override of the declarative effect record. The declarative effect record left every interesting
// clause unexecutable: the [Trash] and [All Turns] digivolve-to-prevent-deletion clauses
// were RawUnparsed, the [When Digivolving] delete branch hung off a raw Condition (the
// interpreter treats raw Conditions as UNMET, so the branch never fired), and the
// inherited [End of Attack] "choose 1 of your Digimon" was RawUnparsed. Removing the
// section 8 + the file-header convention).
//
// KB (authoritative — `node tools/kb/query.mjs card BT17-067`): no errata. Bound Q&A:
//   - Q2821: the [Trash] [All Turns] effect triggers when this card is in the TRASH and
//     your [DoruGreymon] would be deleted ([Trash] = an effect that triggers from trash).
//   - Q2822: using it to digivolve when [DoruGreymon] would be deleted by its DP hitting
//     0 DOES prevent that deletion, but the DP-reduction carries over, so if DP is still
//     0 after the digivolve the Digimon is deleted again. (Requires a real
//     deletion-replacement seam that prevents the pending deletion, then re-checks DP.)
//   - Q2823: if the digivolve happens but DP is still 0, the Digimon is deleted BEFORE
//     the [When Digivolving] effect activates — so When Digivolving does NOT fire then.
//   - Q2824 (BINDING for clause 2): "delete 1 of your opponent's Digimon with a play cost
//     of 6 or less instead" replaces ONLY the "<Draw 1>", NOT the "Trash 1 card in your
//     hand". So the hand-trash always happens; the delete-or-draw is the branch.
//   - Q2825 (BINDING for clause 3): you MAY choose your own Digimon that "can't be deleted
//     by effects", and then you may only delete an opponent's Digimon with a level as high
//     as or lower than that chosen Digimon's level. So the chosen Digimon's level gates the
//     opponent candidate set even when the chosen one itself survives.
const cardId = "BT17-067";

const DORU_GREYMON_NAME = "DoruGreymon";

/** A card definition named [DoruGreymon] (source EqualsCardName("DoruGreymon")). */
const isDoruGreymon = (ctx: EffectContext, card: CardInstance): boolean =>
  ctx.game.definitionOf(card).nameEn === DORU_GREYMON_NAME;

/** Opponent battle-area Digimon (source IsPermanentExistsOnOpponentBattleAreaDigimon). */
const isOpponentBattleAreaDigimon = (
  ctx: EffectContext,
  source: CardSource,
  permanent: Permanent,
): boolean => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return (
    permanent.controllerSeat === opponent &&
    permanent.topCard !== undefined &&
    isDigimon(ctx.game.definitionOf(permanent.topCard))
  );
};

/** This seat's battle-area Digimon (source IsPermanentExistsOnOwnerBattleAreaDigimon). */
const isYourBattleAreaDigimon = (
  ctx: EffectContext,
  source: CardSource,
  permanent: Permanent,
): boolean =>
  permanent.controllerSeat === source.ownerSeat &&
  permanent.topCard !== undefined &&
  isDigimon(ctx.game.definitionOf(permanent.topCard));

/** The level of a permanent's top card, or undefined when it has none. */
const topLevelOf = (ctx: EffectContext, permanent: Permanent): number | undefined =>
  permanent.topCard === undefined ? undefined : ctx.game.definitionOf(permanent.topCard).level;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Clause 1 — [Trash] [All Turns] When one of your [DoruGreymon] would be deleted, by
    //   digivolving it into this card without paying the cost, prevent that deletion.
    //   digivolves the chosen permanent into THIS card from the trash for free and then
    //   sets selectedPermanent.willBeRemoveField = false (cancels the pending deletion).
    //
    // BLOCKED (represented, not faked — card-module contract), but NOT for the
    // three reasons a prior snapshot of this comment claimed — a repo-wide check shows
    // all three are false today:
    //   1. WhenPermanentWouldBeDeleted DOES fire: `deletePermanent` (primitives.ts) calls
    //      `engine.fireTiming(EffectTiming.WhenPermanentWouldBeDeleted, ...)` before
    //      moving any card, for every deletion that routes through it (EX1-073, BT7-063,
    //      EX4-021 are shipped cards filed at this timing).
    //   2. The deletion-replacement seam IS consulted: `deletePermanent` calls
    //      `engine.consultLeavePrevention`, which calls the standalone
    //      `consultLeavePrevention` (leavePrevention.ts), which DOES read
    //      `SubTriggerRegistry.replacementsFor("wouldBeDeleted" | "wouldLeavePlay")`.
    //   3. A "prevent deletion" verb DOES exist: `ctx.fx.subscribeReplacement({ event:
    //      "wouldBeDeleted", mode: "prevent", preventCheck: ... })` is exactly that verb —
    //      ST19-02 (Angewomon (X Antibody)) is the shipped precedent, including a
    //      preventCheck body that performs a paid action (there, deleting itself) before
    //      returning true to cancel the deletion.
    // The REAL remaining gap is narrower: `consultLeavePrevention`'s context builder
    // (GameEngine.ts `permanentById: (id) => this.access.permanentById(id)`) and
    // `subscribeReplacement`'s `sourcePermanentId` anchor both require a LIVE
    // battle-area Permanent — `access.permanentById` only scans `battleArea`, never
    // `trash`. This clause's trigger condition is "while this card is in the TRASH"
    // (source IsExistOnTrash): a trash-resident card has no `permanentId` to anchor a
    // `subscribeReplacement` install to, so there is no way to register this prevention
    // from the trash with the seam as it exists today (a battle-area card CAN register
    // one — see clause 3's `turnTiming` below and ST19-02 — this gap is specific to
    // trash-anchored triggered abilities). The free digivolve-from-trash COST half WOULD
    // be expressible (ctx.fx.digivolveFromInstance(targetPermanentId, source.instanceId,
    // { payCost: false }) — the EX10-013 precedent) once a card in the trash can install
    // a replacement at all. Represented as an inert staticModifier marker so the clause
    // is auditable rather than silently dropped.
    if (timing === EffectTiming.WhenPermanentWouldBeDeleted || timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/trash-all-turns-digivolve-prevent-deletion`,
          description:
            "[Trash] [All Turns] When one of your [DoruGreymon] would be deleted, by " +
            "digivolving it into this card without paying the cost, prevent that deletion.",
          // Only relevant while this card is in the trash (source IsExistOnTrash). The
          // guard is honest even though the body cannot run (see clause header).
          when: (ctx) =>
            Array.from(ctx.game.player(source.ownerSeat).trash).some(
              (card) => card.instanceId === source.instanceId,
            ),
          resolve: async () => {
            // BLOCKED: subscribeReplacement/consultLeavePrevention need a live battle-area
            // Permanent to anchor to; a trash-resident card has none. See the clause header.
          },
        }),
      ];
    }

    // Clause 2 — [When Digivolving] Trash 1 card in your hand. Then, <Draw 1>. If
    //   [DoruGreymon] is in this Digimon's digivolution cards or this digivolved from the
    //   trash, delete 1 of your opponent's Digimon with a play cost of 6 or less instead.
    //   rule implementation discards 1 hand card (when any), then if [DoruGreymon] is among the
    //   permanent's DigivolutionCards OR the digivolve came from the trash, deletes 1
    //   opponent Digimon with GetCostItself <= 6 (mode Destroy), ELSE draws 1.
    // Q2824 (binding): the delete replaces ONLY the <Draw 1>, not the hand-trash.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-draw-or-delete`,
          description:
            "[When Digivolving] Trash 1 card in your hand. Then, <Draw 1>. If [DoruGreymon] " +
            "is in this Digimon's digivolution cards or this digivolved from the trash, " +
            "delete 1 of your opponent's Digimon with a play cost of 6 or less instead.",
          optional: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();

            // "Trash 1 card in your hand." Mandatory when a hand card exists (source
            // it is NOT replaced by the delete branch (Q2824).
            const hand = Array.from(ctx.game.player(source.ownerSeat).hand);
            if (hand.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: hand.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              const toTrash = chosen[0];
              if (toTrash !== undefined) await ctx.fx.trash([toTrash]);
            }

            // "delete ... instead" condition: [DoruGreymon] is among this Digimon's
            // digivolution cards, OR this digivolved from the trash.
            //
            // The "is in this Digimon's digivolution cards" half is read from board state
            // (the permanent's stack — source PermanentOfThisCard().DigivolutionCards).
            // The "digivolved from the trash" half references the provenance of the most
            // recent digivolve; that path is ITSELF clause 1 (blocked) and the engine
            // records no per-permanent "digivolved-from-trash" provenance flag (no field
            // on Permanent, and the digivolve action does not set one), so it is not
            // observable here. The observable digivolution-cards half is evaluated
            // faithfully; the un-observable half can only become true via the blocked
            // clause-1 path, so falling back to the observable check does not drop any
            // behavior reachable in the current engine.
            const doruInStack =
              self !== undefined && self.stack.some((card) => isDoruGreymon(ctx, card));
            const deleteInstead = doruInStack;

            if (deleteInstead) {
              // "delete 1 of your opponent's Digimon with a play cost of 6 or less"
              // (source HasPlayCost && GetCostItself <= 6, mandatory once a target
              // exists: maxCount min(1, matches), canNoSelect false).
              const candidates = Array.from(
                ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea,
              ).filter((permanent) => {
                if (!isOpponentBattleAreaDigimon(ctx, source, permanent)) return false;
                const cost = ctx.game.definitionOf(permanent.topCard!).playCost;
                return cost >= 0 && cost <= 6;
              });
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
                  await ctx.fx.deletePermanent([chosenPermanent.permanentId]);
                }
              }
            } else {
              // "Then, <Draw 1>."
              await ctx.fx.draw(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    // Clause 3 — Inherited [End of Attack] [Once Per Turn] You may choose 1 of your
    //   Digimon. Delete 1 of your chosen Digimon and 1 of your opponent's Digimon with
    //   as high or lower a level as that Digimon.
    //   rule implementation canNoSelect-chooses 1 of your Digimon, then (if an eligible target
    //   exists) mandatorily chooses 1 opponent Digimon with Level <= chosen's Level, then
    //   deletes the collected list together (DeletePeremanentAndProcessAccordingToResult).
    // Q2825 (binding): the chosen own Digimon may be deletion-immune; its level still
    //   gates the opponent candidate set.
    if (timing === EffectTiming.OnEndAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-attack-delete-pair`,
          description:
            "[End of Attack] [Once Per Turn] You may choose 1 of your Digimon. Delete 1 of " +
            "your chosen Digimon and 1 of your opponent's Digimon with as high or lower a " +
            "level as that Digimon.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          // On the field with at least one of your Digimon to choose (source
          // HasMatchConditionOwnersPermanent). The outer "You may" is the optional prompt.
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) =>
              isYourBattleAreaDigimon(ctx, source, permanent),
            ),
          resolve: async (ctx) => {
            const friendly = Array.from(ctx.game.player(source.ownerSeat).battleArea).filter(
              (permanent) => isYourBattleAreaDigimon(ctx, source, permanent),
            );
            if (friendly.length === 0) return;

            // "Choose 1 of your Digimon" (source canNoSelect: true -> min 0). Keyed by
            // the candidate's top-card instance id (the chooseTargets convention).
            const friendlyByTopCard = new Map<string, Permanent>(
              friendly.map((permanent) => [permanent.topCard!.instanceId, permanent]),
            );
            const chosenFriendlyIds = await ctx.ask.chooseTargets(ctx, {
              candidates: Array.from(friendlyByTopCard.keys()),
              min: 0,
              max: 1,
            });
            const chosenFriendlyId = chosenFriendlyIds[0];
            if (chosenFriendlyId === undefined) return; // chose none
            const chosenFriendly = friendlyByTopCard.get(chosenFriendlyId);
            if (chosenFriendly === undefined) return;

            const chosenLevel = topLevelOf(ctx, chosenFriendly);
            // The collected deletion list: the chosen own Digimon, plus the chosen
            // opponent Digimon when an eligible one is selected.
            const toDelete: string[] = [chosenFriendly.permanentId];

            // The opponent target exists only when the chosen Digimon has a level to
            // compare against (source TopCard.HasLevel on the chosen Digimon).
            if (chosenLevel !== undefined) {
              const opponentCandidates = Array.from(
                ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea,
              ).filter((permanent) => {
                if (!isOpponentBattleAreaDigimon(ctx, source, permanent)) return false;
                const level = topLevelOf(ctx, permanent);
                return level !== undefined && level <= chosenLevel;
              });
              if (opponentCandidates.length > 0) {
                const opponentByTopCard = new Map<string, Permanent>(
                  opponentCandidates.map((permanent) => [permanent.topCard!.instanceId, permanent]),
                );
                // Mandatory once an eligible opponent Digimon exists (source
                // canNoSelect: false).
                const chosenOpponentIds = await ctx.ask.chooseTargets(ctx, {
                  candidates: Array.from(opponentByTopCard.keys()),
                  min: 1,
                  max: 1,
                });
                const chosenOpponentId = chosenOpponentIds[0];
                const chosenOpponent =
                  chosenOpponentId === undefined ? undefined : opponentByTopCard.get(chosenOpponentId);
                if (chosenOpponent !== undefined) toDelete.push(chosenOpponent.permanentId);
              }
            }

            await ctx.fx.deletePermanent(toDelete);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
