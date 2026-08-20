import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-001 — Yokomon (BT26, Red In-Training Digi-Egg, Bulb/Iliad/TS).
//
// Audited against KB Q6948-Q6951: every printed field counts for Chronomon text;
// returning a genuinely external card to either player's deck triggers, while merely
// revealing and restoring a deck card does not; controller attribution follows whose
// effect performed the move, not whose deck received the card.
//
// Printed text (inherited-only card; this Digi-Egg carries no effect of its own — its
// whole ability is granted to whatever Digimon it sits under as a digivolution card):
//   Inherited: [Your Turn] [Once Per Turn] When your effects add to decks, this Digimon
//     may digivolve into a Digimon card with [Chronomon] in its text in the hand with the
//     cost reduced by 1.
//
// This was blocked until now on the missing `whenEffectAddsToDeck` sub-trigger
// (the corresponding regression coverage, "Structural gaps found during implementation
// wave 1"). That gap is closed: `returnToDeck` (primitives.ts) fires it per distinct
// recipient seat, and interpreter.ts's `effectAddsToDeckGate` scopes it to the watcher's
// own seat ("your effects") — verified live via subTriggerSeams.test.ts's
// "whenEffectAddsToDeck" suite and irAuditPhase2Capabilities.test.ts before this port.
//
// Modeled on BT26-044's `staticModifier` + `subscribeSubTrigger` reactive-alt-digivolve
// idiom: `oncePerTurnKey` for the printed "[Once Per Turn]" (the ENGINE's real per-turn
// gate for a None-timing watcher — `maxPerTurn` on the enclosing staticModifier is not
// itself consulted for persistent effects), `ctx.fx.digivolveFromInstance(hostId, chosen,
// { payCost: true, costDelta: -1, ignoreRequirements: true })` for the trait-filtered
// (not printed-evo-chain) alternate digivolve target, and `matchNameOrTrait` (imported
// from the interpreter, an established hand-written-card pattern — see EX4-030/BT7-024/
// BT26-009/BT26-065) for "with [Chronomon] in its text".
//
// `digivolveFromInstance` preserves the cheapest printed cost while ignoring only the
// color/level gate, so `costDelta: -1` implements the printed reduction against a real
// baseline and is suppressed by a live digivolution-cost-reduction prohibition.

const cardId = "BT26-001";
const CHRONOMON_TOKEN = "Chronomon";

function isChronomonTextDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && matchNameOrTrait(def, { tokens: [CHRONOMON_TOKEN], match: "text" });
}

function chronomonHandCandidates(ctx: EffectContext, ownerSeat: Seat) {
  const owner = ctx.game.player(ownerSeat);
  return Array.from(owner.hand).filter((c) => isChronomonTextDigimon(ctx.game.definitionOf(c)));
}

/**
 * "This Digimon may digivolve into a Digimon card with [Chronomon] in its text in the
 * hand with the cost reduced by 1." `hostId` is the CURRENT top permanent this Digi-Egg
 * sits under as a digivolution card (the inherited ability's subject).
 */
async function resolveMayDigivolveIntoChronomon(ctx: EffectContext, hostId: string, ownerSeat: Seat): Promise<void> {
  const host = ctx.game.permanentById(hostId);
  if (host === undefined || host.inBreeding) return;

  const candidates = chronomonHandCandidates(ctx, ownerSeat);
  if (candidates.length === 0) return;

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "Digivolve this Digimon into a Digimon card with [Chronomon] in its text in the hand, " +
      "with the cost reduced by 1?",
  );
  if (!wantToActivate) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) {
    ctx.oncePerTurnActivationDeclined = true;
    return;
  }

  const evolved = await ctx.fx.digivolveFromInstance(hostId, chosen[0]!, {
    payCost: true,
    costDelta: -1,
    ignoreRequirements: true,
  });
  if (evolved === undefined) ctx.oncePerTurnActivationDeclined = true;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-reactive-alt-digivolve`,
          description:
            "[Your Turn] (inherited) [Once Per Turn] When your effects add to decks, this " +
            "Digimon may digivolve into a Digimon card with [Chronomon] in its text in the " +
            "hand with the cost reduced by 1.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToDeck",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-reactive-alt-digivolve`,
              description: `${cardId}: an effect of yours adds cards to a deck -> may alt-digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                if (subCtx.trigger?.effectAddedToDeckBySeat !== ownerSeat) return false;
                const liveHost = subCtx.game.permanentById(hostId);
                return (
                  liveHost !== undefined &&
                  !liveHost.inBreeding &&
                  chronomonHandCandidates(subCtx, ownerSeat).length > 0
                );
              },
              run: async (subCtx) => {
                await resolveMayDigivolveIntoChronomon(subCtx, hostId, ownerSeat);
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
