import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-016 — Chronomon: Holy Mode (BT26, Red/Yellow Lv.6 Digimon).
//
// The committed KB contains Q6976-Q6981 (2026-08-18), which confirms the three-card
// payment requirement, mixed-owner trash selection, activating-player ordering, Digi-Egg
// bottom-deck handling, pending On Deletion timing, and face-down security handling.
//
// [Digivolve] Lv.5 w/[TS] trait: Cost 3 — handled centrally by
//   ALTERNATE_DIGIVOLUTION_OVERRIDES, not an effect clause here.
// ＜Piercing＞ / ＜Engage＞ — printed keywords, parsed automatically from effectText by
//   the engine's combat/keywords.ts (PRINTED_MATCHERS); need no explicit grant (same
//   convention as BT26-013's ＜Blocker＞).
// [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may delete 1 of
//   your opponent's Digimon with as much DP as this Digimon or less. Then, by
//   returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.
// [All Turns] [Once Per Turn] When this Digimon would leave the battle area, by
//   returning your top security card to the bottom of the deck, it doesn't leave.
//
// Reading notes:
//   - "Once Per Turn" on the first ability is shared across all three trigger
//     timings (On Play / When Digivolving / When Attacking) — one combined budget,
//     not one per timing — so all three clauses below share the same effectKey.
//   - "Then, by returning 3 cards in trashes to the bottom of the deck, ＜Recovery
//     +1＞" has no "if you did" tying it to the delete, so it is attempted
//     regardless of whether the delete happened, and "trashes" (plural) is read as
//     the combined pool of both players' trash zones (same reading as BT21-079's
//     "both players' trashes" scaling clause). ＜Recovery +1＞ is the action-keyword
//     (interpreter.ts ACTION_TYPE_KEYWORDS) that moves the top card of the
//     controller's deck onto their security — ctx.fx.recoverToSecurity.
//   - The second ability has no "you may" in the printed text, but paying an
//     additional cost to trigger a replacement is always the controller's choice;
//     this mirrors the established preventCheck idiom (BT9-012, EX7-014) of asking
//     before charging the cost. No cause restriction is printed, so the
//     replacement fires regardless of the removal cause (causeAllows omitted).

const cardId = "BT26-016";

/** Opponent battle-area Digimon with DP no greater than `self`'s current DP. */
function deletableOpponentTargets(ctx: EffectContext, source: CardSource, self: Permanent): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= self.currentDP,
  );
}

/**
 * Shared [On Play]/[When Digivolving]/[When Attacking] body: an optional delete of an
 * opponent Digimon at-or-below this Digimon's current DP, then an independent,
 * cost-gated ＜Recovery +1＞ paid by returning 3 cards from either trash to the
 * bottom of the deck.
 */
async function resolveDeleteThenRecovery(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;

  // "You may delete 1 of your opponent's Digimon with as much DP as this Digimon or less."
  const deleteCandidates = deletableOpponentTargets(ctx, source, self);
  if (deleteCandidates.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: deleteCandidates.map((p) => p.permanentId),
      min: 0,
      max: 1,
    });
    if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
  }

  // "Then, by returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞."
  const owner = ctx.game.player(source.ownerSeat);
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const trashCandidates = [...Array.from(owner.trash), ...Array.from(opponent.trash)].map((c) => c.instanceId);
  if (trashCandidates.length < 3) return;

  const wantToPay = await ctx.ask.optional(
    ctx,
    "Return 3 cards from either trash to the bottom of the deck to gain <Recovery +1>?",
  );
  if (!wantToPay) return;

  const toReturn = await ctx.ask.selectCards(ctx, { candidates: trashCandidates, min: 3, max: 3 });
  if (toReturn.length !== 3) return;

  await ctx.fx.returnToDeck(toReturn, { toTop: false });
  await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/delete-then-recovery`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may delete 1 " +
            "of your opponent's Digimon with as much DP as this Digimon or less. Then, by " +
            "returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveDeleteThenRecovery(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/delete-then-recovery`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may delete 1 " +
            "of your opponent's Digimon with as much DP as this Digimon or less. Then, by " +
            "returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveDeleteThenRecovery(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/delete-then-recovery`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may delete 1 " +
            "of your opponent's Digimon with as much DP as this Digimon or less. Then, by " +
            "returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await resolveDeleteThenRecovery(ctx, source);
          },
        }),
      ];
    }

    // [All Turns] [Once Per Turn] When this Digimon would leave the battle area, by
    // returning your top security card to the bottom of the deck, it doesn't leave.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-leave-return-security`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by " +
            "returning your top security card to the bottom of the deck, it doesn't leave.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/prevent-leave-return-security`,
              description:
                "[All Turns] [Once Per Turn] By returning your top security card to the " +
                "bottom of the deck, this Digimon doesn't leave the battle area.",
              protects: (_subCtx, leavingId) => leavingId === selfId,
              preventCheck: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const topSecurity = owner.security[0];
                if (topSecurity === undefined) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Return your top security card to the bottom of the deck to keep this Digimon from leaving the battle area?",
                );
                if (!wantToPay) return false;

                await subCtx.fx.returnToDeck([topSecurity.instanceId], { toTop: false });
                return true;
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
