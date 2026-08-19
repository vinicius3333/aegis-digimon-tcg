import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-090 — Kanan Yuki (BT26, Green Tamer).
 *
 * The committed KB contains Q7143 (2026-08-18), confirming that “4 or less memory”
 * refers to positions 4 and to the right on the controller's side of the gauge.
 *
 * Printed text:
 *   [Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.
 *   [End of Your Turn] By suspending this Tamer, you may use 1 Option card with the
 *   [TS] trait from your hand. For each point of memory your opponent has, reduce
 *   this effect's paid cost by 1.
 *   [Security] Play this card without paying the cost.
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — "if you have 4 or less memory, gain 1 memory" is a
 *     mandatory conditional gain, modeled on BT22-092's/BT23-025's memory-threshold
 *     `canActivate` checks: read `ctx.game.state.memory` (turn-relative; positive favors
 *     `ctx.game.state.turnSeat`) and, since the `when` guard already restricts this window
 *     to the owner's own turn (so `turnSeat === source.ownerSeat` here), the owner's memory
 *     IS `ctx.game.state.memory` directly — no sign flip needed. No new primitive; this is
 *     a plain state read, not an engine algorithm.
 *
 *   EffectTiming.OnEndTurn — "By suspending this Tamer, you may use 1 Option card with the
 *     [TS] trait from your hand. For each point of memory your opponent has, reduce this
 *     effect's paid cost by 1." Cost+optional-use, modeled on BT26-089's "By placing 1
 *     [BEATBREAK] card ..." clause shape: `optional: true`, `canActivate` requires an
 *     eligible [TS] Option in hand and this Tamer unsuspended, `resolve` lets the
 *     controller pick 0-or-1 candidate (declining pays no cost at all) — mirrors
 *     BT10-041/EX4-030's "use 1 Option card from your hand ... without paying the cost"
 *     shape, which calls `ctx.fx.useOptionFromHand(instanceId, originalCost)` (the
 *     lifecycle verb: trashes the Option and fires `whenOptionUsed`, carrying the
 *     ORIGINAL printed cost for any watcher gate — KB Q5471-Q5473 pattern seen in
 *     EX4-030/EX2-060). Unlike those two cards, this Option use is NOT fully free: the
 *     paid cost is the Option's printed cost reduced by 1 per point of memory the
 *     opponent currently has (floor 0), paid via `ctx.fx.gainMemory(-reducedCost)`
 *     before the use — the same "pay the reduced cost, then useOptionFromHand with the
 *     ORIGINAL cost" order used by the interpreter's own use-option path (EX2-060).
 *     Opponent memory is read the same turn-relative way as above: since this window is
 *     also gated to the owner's own turn, the opponent is never `turnSeat`, so the
 *     opponent's memory is `-ctx.game.state.memory` (clamped to 0 before subtracting,
 *     since a negative "memory the opponent has" grants no reduction).
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT26-090";

function isTsTraitOption(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Option as string)) return false;
  return (def.types ?? []).includes("TS");
}

/** Turn-relative memory `seat` currently has (positive favors `ctx.game.state.turnSeat`). */
function memoryFor(ctx: EffectContext, seat: Seat): number {
  const m = ctx.game.state.memory;
  return seat === ctx.game.state.turnSeat ? m : -m;
}

function tsOptionCandidates(ctx: EffectContext, ownerSeat: Seat): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isTsTraitOption(ctx.game.definitionOf(c)));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as Seat;

    // [Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-conditional-gain-memory`,
          description: "[Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => memoryFor(ctx, ownerSeat) <= 4,
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [End of Your Turn] By suspending this Tamer, you may use 1 Option card with the [TS]
    // trait from your hand. For each point of memory your opponent has, reduce this effect's
    // paid cost by 1.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-suspend-use-ts-option`,
          description:
            "[End of Your Turn] By suspending this Tamer, you may use 1 Option card with " +
            "the [TS] trait from your hand. For each point of memory your opponent has, " +
            "reduce this effect's paid cost by 1.",
          optional: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            return tsOptionCandidates(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            const candidates = tsOptionCandidates(ctx, ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
            const optionCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;

            await ctx.fx.suspend([self.permanentId]);

            const opponentSeat = ctx.game.opponentOf(ownerSeat);
            const opponentMemory = Math.max(0, memoryFor(ctx, opponentSeat));
            const reducedCost = Math.max(0, (optionCost ?? 0) - opponentMemory);
            if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);

            await ctx.fx.useOptionFromHand(ctx, chosen[0]!, optionCost);
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
