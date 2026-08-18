import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Guilmon (BT17-008, Red Lv.3 Digimon).
//
// Hand-written override of the declarative effect record. The declarative effect record was BROKEN for the
// main clause in two ways:
//   (1) It gated the memory gain with `opponentHasNone`. The interpreter runs an
//       effect's actions in sequence and re-reads board state per action, so the
//       Delete resolves FIRST; if it removed the sole opponent Digimon with 3000 DP
//       or less, `opponentHasNone` then flips true and the memory is granted even
//       though the effect DID delete. That inverts the rule.
//   (2) The IR `SubTrigger.sourceFilter` (the [Calumon] / [Takato Matsuki]
//       discrimination) is silently dropped: the interpreter's runSubTrigger forwards
//       only event/sourcePermanentId/once/run/description to the engine, so the trigger
//       would arm on ANY permanent being played.
// This module evaluates "didn't delete" against real board state (a Digimon was
// actually removed) and filters the trigger on the played permanent's name.
//
// KB (authoritative — `node tools/kb/query.mjs card BT17-008`): no errata; bound rulings:
//   - Q2710: the deletion is MANDATORY. With a valid target you must choose one; you
//     cannot decline the delete to take the memory instead.
//   - Q2711: you MAY target an opponent Digimon that has "can't be deleted by your
//     opponent's effects". If the deletion is then prevented the effect "didn't
//     delete", so you gain 1 memory. Hence "didn't delete" is decided by whether a
//     Digimon was ACTUALLY removed, not by whether a target was chosen.
//   - Q2712/Q2713: the inherited ESS raises the DP-based deletion MAXIMUM by 2000 while
//     this card's controller has 0 or less memory (so "3000 or less" becomes "5000 or
//     less"); Q2714: it does not raise thresholds that reference a Digimon's DP.
const cardId = "BT17-008";

// source CardSource.EqualsCardName("Calumon"): exact card-name equality.
const nameEquals = (def: CardDefinition, name: string): boolean => def.nameEn === name;

// also accepts the no-space "TakatoMatsuki" spelling defensively.
const nameContains = (def: CardDefinition, fragment: string): boolean =>
  def.nameEn.includes(fragment);

/**
 * Whether one of the permanents the controller just played is [Calumon] (a Digimon) or
 * a Tamer with [Takato Matsuki] in its name (source PlayedPermanentCondition:
 * IsPermanentExistsOnOwnerBattleArea + (Digimon && EqualsCardName("Calumon")) ||
 * (Tamer && ContainsCardName("Takato Matsuki"/"TakatoMatsuki"))).
 *
 * TriggerInfo carries no "just-entered permanents" field yet, so — like AD1-010 — this
 * reads the owner's current battle-area permanents whose top card matches. Best-effort
 * stand-in until the trigger payload carries the just-played permanents.
 */
const triggeredByCalumonOrTakato = (ctx: EffectContext, source: CardSource): boolean => {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).some((permanent: Permanent) => {
    if (permanent.controllerSeat !== source.ownerSeat || permanent.topCard === undefined) {
      return false;
    }
    const def = ctx.game.definitionOf(permanent.topCard);
    if (isDigimon(def) && nameEquals(def, "Calumon")) return true;
    if (isTamer(def) && (nameContains(def, "Takato Matsuki") || nameContains(def, "TakatoMatsuki"))) {
      return true;
    }
    return false;
  });
};

// Opponent battle-area Digimon with 3000 DP or less (source
// IsPermanentExistsOnOpponentBattleAreaDigimon + `permanent.DP <= MaxDP_DeleteEffect(3000)`).
//
// NOTE: the source threshold is `card.Owner.MaxDP_DeleteEffect(3000, ...)`, which this
// card's own inherited ESS clause can raise to 5000 while its controller has 0 or less
// memory (Q2712/Q2713). That maximum-raising mechanic is NOT modeled by the engine yet
// (see the EffectTiming.None clause), so this uses the printed 3000 threshold. When a
// DP-deletion-maximum subsystem lands, this bound must read it.
const deletionCandidates = (ctx: EffectContext, source: CardSource): Permanent[] => {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter(
    (permanent) =>
      permanent.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
      permanent.currentDP <= 3000,
  );
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] [Once Per Turn] When one of your [Calumon] or Tamers with [Takato
    // Matsuki] in their name is played, delete 1 of your opponent's Digimon with 3000 DP
    // or less. If this effect didn't delete, gain 1 memory.
    //
    //   The rule implementation selects 1 target (mandatory; maxCount = min(1, matches)), deletes
    //   it via DeletePeremanentAndProcessAccordingToResult, and on FAILURE (nothing
    //   deleted) runs AddMemory(1). This is a someone-else-entered-the-field trigger, so it
    //   maps to the OnEnterFieldAnyone window (cf. AD1-010), not this card's own OnPlay.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-play-calumon-takato-delete-or-memory`,
          description:
            "[Your Turn] [Once Per Turn] When one of your [Calumon] or Tamers with " +
            "[Takato Matsuki] in their name is played, delete 1 of your opponent's Digimon " +
            "with 3000 DP or less. If this effect didn't delete, gain 1 memory.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            triggeredByCalumonOrTakato(ctx, source),
          resolve: async (ctx) => {
            const candidates = deletionCandidates(ctx, source);

            // The deletion is mandatory whenever a valid target exists (Q2710); the
            // controller chooses which one (a deletion-immune target is a legal choice,
            // Q2711). Decisions are keyed by the candidate's top-card instance id.
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
                // protected by "can't be deleted by your opponent's effects" survives, so
                // the effect didn't delete and the memory gain applies (Q2711).
                deletedSomething = ctx.game.permanentById(permanentId) === undefined;
              }
            }

            if (!deletedSomething) {
              ctx.fx.gainMemory(1);
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
    // ContinuousEffectLedger for it, no Primitives verb to register it, and — decisively —
    // no CONSUMER: the only place a DP threshold is read for deletion is the per-card /
    // interpreter target filter (a fixed `currentDP <= N`), which never consults a raised
    // maximum. Wiring this needs a shared-engine change (a deletion-maximum store + reading
    // it in every DP-based delete bound), which is out of scope for this per-card fan-out
    // (parallel-unsafe: no new shared IR kinds / shared-engine edits). Q2713/Q2714 fix its
    // exact behavior for when it lands: it raises the numeric maximum shown by a DP-based
    // deletion effect ("3000 or less" -> "5000 or less"), but NOT effects whose threshold
    // references a Digimon's DP rather than a printed number. The sibling card BT17-010 has
    // this identical clause and the same BLOCKED treatment.
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
            // BLOCKED: needs a DP-based-deletion-maximum subsystem (store + consumer in the
            // delete bound). See the clause header; no existing primitive expresses it.
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
