import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT16-080 — Shroudmon (BT16, Black Lv.6 Digimon).
 *
 *
 * [When Digivolving] + [End of Attack] (once per turn, shared):
 *   - If you have ≥3 security: -7000 DP to 1 opponent Digimon for the turn.
 *   - If you have ≤3 security: delete 1 unsuspended opponent Digimon.
 *   - KB Q2666: at exactly 3 security BOTH branches activate.
 *
 * [All Turns] (static leave prevention):
 *   - When this Digimon would leave the battle area by an opponent's effect,
 *     if you have ≥3 security cards, by trashing your top security card,
 *     prevent it from leaving.
 *
 * [On Deletion]:
 *   - ＜Recovery +1 (Deck)＞ until you have 3 security cards.
 *   - KB Q2667: loops while security < 3; does nothing if already at 3+.
 */

const cardId = "BT16-080";

/** The once-per-turn shared key for WhenDigivolving + EndOfAttack. */
const SHARED_KEY = `${cardId}/dp-or-delete`;

/** Opponent's battle-area Digimon permanents. */
function opponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

/** Opponent's unsuspended battle-area Digimon permanents. */
function opponentUnsuspendedDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return opponentDigimon(ctx, source).filter((p) => !p.isSuspended);
}

/**
 * The shared resolve body for [When Digivolving] + [End of Attack].
 * KB Q2666: at exactly 3 security both branches run (≥3 AND ≤3 are both satisfied).
 */
async function dpOrDeleteResolve(ctx: EffectContext, source: CardSource): Promise<void> {
  const ownerSeat = source.ownerSeat;
  const securityCount = ctx.game.player(ownerSeat).security.length;

  // Branch 1: if ≥3 security → -7000 DP to 1 opponent Digimon for the turn.
  if (securityCount >= 3) {
    const candidates = opponentDigimon(ctx, source);
    if (candidates.length > 0) {
      const topCardIdToPermanent = new Map<string, Permanent>(
        candidates.map((p) => [p.topCard!.instanceId, p]),
      );
      const chosen = await ctx.ask.chooseTargets(ctx, {
        candidates: Array.from(topCardIdToPermanent.keys()),
        min: 1,
        max: 1,
      });
      const chosenPermanent = chosen[0] !== undefined ? topCardIdToPermanent.get(chosen[0]) : undefined;
      if (chosenPermanent !== undefined) {
        ctx.fx.modifyDP(chosenPermanent.permanentId, -7000, EffectDuration.UntilEachTurnEnd);
      }
    }
  }

  // Branch 2: if ≤3 security → delete 1 unsuspended opponent Digimon.
  if (securityCount <= 3) {
    const candidates = opponentUnsuspendedDigimon(ctx, source);
    if (candidates.length > 0) {
      const topCardIdToPermanent = new Map<string, Permanent>(
        candidates.map((p) => [p.topCard!.instanceId, p]),
      );
      const chosen = await ctx.ask.chooseTargets(ctx, {
        candidates: Array.from(topCardIdToPermanent.keys()),
        min: 1,
        max: 1,
      });
      const chosenPermanent = chosen[0] !== undefined ? topCardIdToPermanent.get(chosen[0]) : undefined;
      if (chosenPermanent !== undefined) {
        await ctx.fx.deletePermanent([chosenPermanent.permanentId]);
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] (shared once-per-turn with EndOfAttack): -7000 DP or delete.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: SHARED_KEY,
          description:
            "[When Digivolving] If ≥3 security: -7000 DP to 1 opponent Digimon for the turn. " +
            "If ≤3 security: delete 1 unsuspended opponent Digimon.",
          optional: false,
          maxPerTurn: 1,
          resolve: (ctx) => dpOrDeleteResolve(ctx, source),
        }),
      ];
    }

    // [End of Attack] (shared once-per-turn with WhenDigivolving): same body, same key.
    if (timing === EffectTiming.OnEndAttack) {
      return [
        turnTiming({
          source,
          effectKey: SHARED_KEY,
          description:
            "[End of Attack] If ≥3 security: -7000 DP to 1 opponent Digimon for the turn. " +
            "If ≤3 security: delete 1 unsuspended opponent Digimon.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            const self = source.permanent();
            return (
              self !== undefined &&
              (ctx.trigger.attackerPermanentId === self.permanentId ||
                ctx.trigger.defenderPermanentId === self.permanentId)
            );
          },
          resolve: (ctx) => dpOrDeleteResolve(ctx, source),
        }),
      ];
    }

    // [All Turns] (static/continuous): leave-prevention replacement.
    // When this Digimon would leave by an opponent's effect, if you have ≥3 security,
    // by trashing your top security card, prevent it from leaving.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/leave-prevention`,
          description:
            "[All Turns] When this Digimon would leave the battle area by an opponent's effect, " +
            "if you have ≥3 security, by trashing your top security card, prevent it.",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              description:
                "BT16-080: prevent leaving by trashing top security (≥3 security gate)",
              // Only this card's own permanent is protected.
              protects: (_subCtx, leavingId) => leavingId === self.permanentId,
              // Only fires when the removal is driven by an opponent's effect.
              causeAllows: (cause, resolvingSeat) =>
                cause === "byEffect" &&
                resolvingSeat !== undefined &&
                resolvingSeat !== ownerSeat,
              // Condition gate + cost: owner must have ≥3 security, then trash the top card.
              preventCheck: async (subCtx) => {
                if (subCtx.game.player(ownerSeat).security.length < 3) return false;
                const trashed = await subCtx.fx.trashFromSecurity(ownerSeat, 1, { fromTop: true });
                return trashed.length > 0;
              },
            });
          },
        }),
      ];
    }

    // [On Deletion]: ＜Recovery +1 (Deck)＞ until you have 3 security cards.
    // KB Q2667: loops while security.length < 3. No-op if already at 3+.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/recovery-loop`,
          description:
            "[On Deletion] ＜Recovery +1 (Deck)＞ until you have 3 cards in your security stack.",
          optional: false,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            while (ctx.game.player(ownerSeat).security.length < 3) {
              const moved = await ctx.fx.recoverToSecurity(ownerSeat, 1);
              // Stop if the deck is empty (recoverToSecurity returns [] when deck runs out).
              if (moved.length === 0) break;
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
