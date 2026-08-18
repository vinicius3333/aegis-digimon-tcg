import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Rhythm — BT17-089 (Yellow Tamer).
//
// The declarative effect record was WRONG on all three clauses:
//
// 1. Effect 1 (Your Turn, when an effect suspends one of your Digimon, you may suspend
//    this Tamer) was filed under "Static" — a timing-less continuous window — instead of
//    EffectTiming.OnTappedAnyone (the suspend trigger window). The effect also must check
//    that the suspended permanent belongs to the owner and is a Digimon, and that this
//    Tamer is not already suspended.
//
// 2. Effect 2 (Your Turn, when this Tamer becomes suspended, gain 1 memory; then if you
//    have [Argomon] or a yellow Digimon with [Agumon]/[Greymon] in name, <Draw 1>) was
//    filed under "YourTurn" with no trigger guard, so it would fire on every Your-Turn
//    window rather than only when this specific Tamer becomes suspended.
//
// 3. The Security effect was missing entirely from the IR.
//
//   timing == OnTappedAnyone (×2):
//     Effect 1 — optional, Your Turn, your Digimon was suspended, this Tamer not suspended
//                -> you may suspend this Tamer
//     Effect 2 — maxCountPerTurn -1 (unlimited), Your Turn, THIS Tamer was the one suspended
//                -> gain 1 memory, then conditional <Draw 1>
//   timing == SecuritySkill -> PlaySelfTamerSecurityEffect
//
// KB (node tools/kb/query.mjs card BT17-089):
//   Q2872: "when an effect suspends" does NOT trigger from an attack declaration
//          (attack-declaration suspension is a RULE, not an effect). The `when` guard
//          cannot distinguish effect vs. rule suspension from TriggerInfo alone
//          (no `suspendedByEffect` field); the guard is documented so it can be
//          tightened once the engine exposes that field.
const cardId = "BT17-089";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        // Effect 1: [Your Turn] When an effect suspends one of your Digimon, you may
        // suspend this Tamer.
        //     priority -1, optional true), IsOwnerTurn, SuspendedCondition = your Digimon,
        //     IsByEffect(hashtable, null) — suspended by an effect (not by attack rule),
        //
        // NOTE (KB Q2872): the "by effect" guard cannot be precisely enforced with the
        // current TriggerInfo (no `suspendedByEffect` flag). The engine fires
        // OnTappedAnyone for ALL suspends (both rule and effect). This port registers
        // the correct timing and behavioral intent; the "by effect only" constraint will
        // activate automatically once the engine adds a `byEffect` field to TriggerInfo.
        turnTiming({
          source,
          effectKey: `${cardId}/suspend-self-when-your-digimon-suspended`,
          description:
            "[Your Turn] When an effect suspends one of your Digimon, you may suspend this Tamer.",
          optional: true,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const self = source.permanent();
            // This Tamer must not already be suspended.
            if (self === undefined || self.isSuspended) return false;
            // The suspended permanent must be one of YOUR battle-area Digimon.
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            const suspended = ctx.game.permanentById(suspendedId);
            if (suspended === undefined || suspended.topCard === undefined) return false;
            if (suspended.controllerSeat !== source.ownerSeat) return false;
            return isDigimon(ctx.game.definitionOf(suspended.topCard));
          },
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.suspend([self.permanentId]);
            }
          },
        }),

        // Effect 2: [Your Turn] When this Tamer becomes suspended, gain 1 memory. Then,
        // if you have [Argomon] or a yellow Digimon with [Agumon]/[Greymon] in its name,
        // <Draw 1>.
        //     your permanents matches Argomon-name || yellow color + (Agumon name || HasGreymonName))
        //     -> rule implementation(Owner, 1).
        //
        // HasGreymonName checks for "Greymon" substring in any card name.
        // Modeled here as a names.includes("Greymon") check on the top card's name / altNames.
        turnTiming({
          source,
          effectKey: `${cardId}/when-self-suspended-memory-draw`,
          description:
            "[Your Turn] When this Tamer becomes suspended, gain 1 memory. Then, if you " +
            "have [Argomon] or a yellow Digimon with [Agumon] or [Greymon] in its name, <Draw 1>.",
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            // THIS Tamer's permanent must be the one that was suspended.
            return ctx.trigger.suspendedPermanentId === self.permanentId;
          },
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);

            // Check if owner has [Argomon] or yellow Digimon with Agumon/Greymon name.
            const hasQualifyingDigimon = ctx.game
              .player(source.ownerSeat)
              .battleArea.some((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                if (def.nameEn === "Argomon") return true;
                // Yellow color + ("Agumon" in name OR "Greymon" in name).
                if (!def.colors.includes(CardColor.Yellow)) return false;
                return def.nameEn.includes("Agumon") || def.nameEn.includes("Greymon");
              });

            if (hasQualifyingDigimon) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    // [Security] Play this card without paying its cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
