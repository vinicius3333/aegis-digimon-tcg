import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-015 — Butenmon (BT26, Red/Yellow Lv.5 Digimon, Shaman/Iliad/TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-015 as of this port
// (`node tools/kb/query.mjs card BT26-015` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.4 w/[TS] trait: Cost 3 — handled centrally by
//     ALTERNATE_DIGIVOLUTION_OVERRIDES, not an effect clause here (same convention as
//     BT26-009/BT26-016/BT26-044).
//   [On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP until their
//     turn ends. Then, by returning 1 card in your trash to the bottom of the deck,
//     delete 1 of your opponent's 5000 DP or lower Digimon.
//   [Your Turn] [Once Per Turn] When your effects add to decks, 1 of your Digimon may
//     get +3000 DP until your opponent's turn ends and attack.
//   Inherited: [All Turns] [Once Per Turn] When your effects add to decks, this Digimon
//     with [Chronomon] in its text may unsuspend.
//
// This was blocked until now on the missing `whenEffectAddsToDeck` sub-trigger
// (the corresponding regression coverage, "Structural gaps found during implementation
// wave 1"). That gap is closed: `returnToDeck` (primitives.ts) fires it per distinct
// recipient seat, and interpreter.ts's `effectAddsToDeckGate` scopes it to the watcher's
// own seat ("your effects") — verified live via subTriggerSeams.test.ts's
// "whenEffectAddsToDeck" suite and irAuditPhase2Capabilities.test.ts before this port.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body) — the -4000 DP is
//     MANDATORY (no "you may"), modeled on BT26-031's `modifyDP(targetId, -8000, ...)`
//     mandatory-target idiom. "Then, by returning 1 card in your trash to the bottom of
//     the deck, delete ..." is an independent, cost-gated optional action (not tied to
//     the DP debuff by an "if you did"), modeled on BT26-016's "Then, by returning N
//     cards in trashes to the bottom of the deck, X" ask-before-paying idiom — scoped
//     here to "your trash" only (the printed text, unlike BT26-016, does not say
//     "trashes").
//   EffectTiming.None, isInherited: false — "[Your Turn] [Once Per Turn] When your
//     effects add to decks, 1 of your Digimon may get +3000 DP until your opponent's
//     turn ends and attack." Modeled on BT26-044's `whenEffectAddsToDeck`-adjacent
//     `staticModifier` + `subscribeSubTrigger` reactive idiom (`oncePerTurnKey` for the
//     real per-turn gate) and BT24-085's `ctx.fx.forceAttack` "may ... and attack" tail.
//   EffectTiming.None, isInherited: true — "[All Turns] [Once Per Turn] When your
//     effects add to decks, this Digimon with [Chronomon] in its text may unsuspend."
//     "This Digimon" is the CURRENT host (whatever permanent this card sits under as a
//     digivolution material), so the "[Chronomon] in its text" gate reads the HOST's own
//     definition, not this card's — the same self-referential-host pattern BT26-044's
//     inherited clause reads via `ctx.game.definitionOf(host.topCard)`.

const cardId = "BT26-015";
const CHRONOMON_TOKEN = "Chronomon";

function isDigimonPermanent(p: Permanent, ctx: EffectContext): boolean {
  if (p.inBreeding || p.topCard === undefined) return false;
  return isDigimon(ctx.game.definitionOf(p.topCard));
}

function opponentDigimonTargets(ctx: EffectContext, opponentSeat: Seat): Permanent[] {
  return Array.from(ctx.game.player(opponentSeat).battleArea).filter((p) => isDigimonPermanent(p, ctx));
}

/**
 * Shared [On Play]/[When Digivolving] body: mandatory -4000 DP on 1 of the opponent's
 * Digimon, then an independent, cost-gated delete of 1 of the opponent's 5000-DP-or-lower
 * Digimon paid by returning 1 of the controller's own trash cards to the bottom of the deck.
 */
async function resolveDebuffThenDeleteByTrashReturn(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);

  // "1 of your opponent's Digimon gets -4000 DP until their turn ends." (mandatory)
  const debuffTargets = opponentDigimonTargets(ctx, opponentSeat);
  if (debuffTargets.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: debuffTargets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      ctx.fx.modifyDP(chosen[0]!, -4000, EffectDuration.UntilOpponentTurnEnd);
    }
  }

  // "Then, by returning 1 card in your trash to the bottom of the deck, delete 1 of your
  // opponent's 5000 DP or lower Digimon."
  const owner = ctx.game.player(source.ownerSeat);
  if (owner.trash.length === 0) return;
  const deleteCandidates = opponentDigimonTargets(ctx, opponentSeat).filter((p) => p.currentDP <= 5000);
  if (deleteCandidates.length === 0) return;

  const wantToPay = await ctx.ask.optional(
    ctx,
    "Return 1 card from your trash to the bottom of the deck to delete 1 of your " +
      "opponent's 5000 DP or lower Digimon?",
  );
  if (!wantToPay) return;

  const toReturn = await ctx.ask.selectCards(ctx, {
    candidates: Array.from(owner.trash).map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (toReturn.length === 0) return;

  const deleteTarget = await ctx.ask.chooseTargets(ctx, {
    candidates: deleteCandidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (deleteTarget.length === 0) return;

  await ctx.fx.returnToDeck(toReturn, { toTop: false });
  await ctx.fx.deletePermanent(deleteTarget);
}

/** "1 of your Digimon may get +3000 DP until your opponent's turn ends and attack." */
async function resolveMayBuffAndAttack(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const targets = Array.from(ctx.game.player(ownerSeat).battleArea).filter((p) => isDigimonPermanent(p, ctx));
  if (targets.length === 0) return;

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "1 of your Digimon gets +3000 DP until your opponent's turn ends and attacks?",
  );
  if (!wantToActivate) return;

  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: targets.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  ctx.fx.modifyDP(chosen[0]!, 3000, EffectDuration.UntilOpponentTurnEnd);
  await ctx.fx.forceAttack(chosen[0]!);
}

/** Is the CURRENT HOST (whatever this card is attached to) a Digimon with [Chronomon] in its text? */
function hostHasChronomonText(ctx: EffectContext, host: Permanent): boolean {
  if (host.topCard === undefined) return false;
  const def: CardDefinition = ctx.game.definitionOf(host.topCard);
  return matchNameOrTrait(def, { tokens: [CHRONOMON_TOKEN], match: "text" });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/debuff-then-delete`,
          description:
            "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP " +
            "until their turn ends. Then, by returning 1 card in your trash to the " +
            "bottom of the deck, delete 1 of your opponent's 5000 DP or lower Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => resolveDebuffThenDeleteByTrashReturn(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/debuff-then-delete`,
          description:
            "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP " +
            "until their turn ends. Then, by returning 1 card in your trash to the " +
            "bottom of the deck, delete 1 of your opponent's 5000 DP or lower Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => resolveDebuffThenDeleteByTrashReturn(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-reactive-buff-attack`,
          description:
            "[Your Turn] [Once Per Turn] When your effects add to decks, 1 of your " +
            "Digimon may get +3000 DP until your opponent's turn ends and attack.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToDeck",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/your-turn-reactive-buff-attack`,
              description: `${cardId}: an effect of yours adds cards to a deck -> may +3000 DP and attack.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger?.effectAddedToDeckSeat === ownerSeat;
              },
              run: async (subCtx) => resolveMayBuffAndAttack(subCtx, ownerSeat),
            });
          },
        }),
        // Inherited: [All Turns] [Once Per Turn] When your effects add to decks, this
        // Digimon with [Chronomon] in its text may unsuspend.
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-reactive-unsuspend`,
          description:
            "[All Turns] (inherited) [Once Per Turn] When your effects add to decks, " +
            "this Digimon with [Chronomon] in its text may unsuspend.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;

            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToDeck",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/inherited-reactive-unsuspend`,
              description: `${cardId}: an effect of yours adds cards to a deck -> host may unsuspend.`,
              matches: (subCtx) => {
                const host = subCtx.game.permanentById(hostId);
                if (host === undefined || !hostHasChronomonText(subCtx, host)) return false;
                return subCtx.trigger?.effectAddedToDeckSeat === ownerSeat;
              },
              run: async (subCtx) => {
                const host = subCtx.game.permanentById(hostId);
                if (host === undefined || !host.isSuspended) return;
                const wantToActivate = await subCtx.ask.optional(
                  subCtx,
                  "Unsuspend this Digimon?",
                );
                if (!wantToActivate) return;
                await subCtx.fx.unsuspend([hostId]);
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
