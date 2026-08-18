import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT24-085 — Dan Yuki & Kanan Yuki (BT24, Green/Red Tamer).
 *
 * Printed text (cards.json effectText; no errata):
 *   [Start of Your Main Phase] If you have 4 or less memory, gain 1 memory.
 *   [End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option card
 *   with as high or lower a use cost as your opponent's memory from your hand without
 *   paying the cost. Then, 1 of your Digimon with the [TS] trait may attack.
 *   [Security] Play this card without paying the cost.
 *
 * KB (node tools/kb/query.mjs card BT24-085):
 *   Q5671: "4 or less" gates on YOUR OWN memory.
 *   Q5672: neither the Option use nor the trailing attack can happen without paying
 *     the suspend cost — both sub-clauses share the same "by suspending" gate, but are
 *     each independently optional past that point (declining the Option use does not
 *     forfeit the attack, and vice versa).
 *
 * Clause mapping:
 *   EffectTiming.OnStartMainPhase — mandatory conditional gain, modeled on
 *     BT22-092's/BT23-025's/BT26-090's memory-threshold `canActivate` checks.
 *
 *   EffectTiming.OnEndTurn — "By suspending this Tamer, you may use 1 [TS] Option
 *     card ... without paying the cost. Then, 1 of your Digimon with the [TS] trait
 *     may attack." Modeled on BT26-090's "By suspending this Tamer, you may use 1
 *     Option card with the [TS] trait ..." shape (suspend cost paid once the overall
 *     `optional: true` activation is accepted, then `ctx.fx.useOptionFromHand` for the
 *     free Option use — BT10-041/EX4-030/EX2-060/BT26-090 all call it the same way),
 *     with two differences: the Option is fully free (no per-point cost reduction) but
 *     gated by use-cost <= opponent's current memory instead, and the trailing "1 of
 *     your Digimon with the [TS] trait may attack" clause (modeled on BT19-090's
 *     candidate-select + `ctx.fx.forceAttack`, which respects the "no attack while one
 *     is in progress"/suspended-attacker rules per Q2490/Q3006-style guards baked into
 *     the primitive) fires independently of whether an Option was actually used.
 *
 *   EffectTiming.SecuritySkill — [Security] Play this card without paying the cost.
 */
const cardId = "BT24-085";

function isTsTraitOption(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Option as string)) return false;
  return (def.types ?? []).includes("TS");
}

function isTsTraitDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
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

/** Owner battle-area Digimon with the [TS] trait (the "1 of your Digimon" attacker candidates). */
function tsAttackCandidates(ctx: EffectContext, ownerSeat: Seat): Permanent[] {
  return Array.from(ctx.game.player(ownerSeat).battleArea).filter(
    (perm) => perm.topCard !== undefined && isTsTraitDigimon(ctx.game.definitionOf(perm.topCard)),
  );
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

    // [End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option card
    // with as high or lower a use cost as your opponent's memory from your hand without
    // paying the cost. Then, 1 of your Digimon with the [TS] trait may attack.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-suspend-use-ts-option-then-attack`,
          description:
            "[End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option " +
            "card with as high or lower a use cost as your opponent's memory from your " +
            "hand without paying the cost. Then, 1 of your Digimon with the [TS] trait " +
            "may attack.",
          optional: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            const oppMemory = Math.max(0, memoryFor(ctx, ctx.game.opponentOf(ownerSeat)));
            const hasEligibleOption = tsOptionCandidates(ctx, ownerSeat).some(
              (c) => (ctx.game.definitionOf(c).playCost ?? 0) <= oppMemory,
            );
            return hasEligibleOption || tsAttackCandidates(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return;

            // Cost: suspend this Tamer. Both sub-clauses below share this one gate
            // (KB Q5672) but are otherwise independently optional.
            await ctx.fx.suspend([self.permanentId]);

            // "You may use 1 [TS] trait Option card with as high or lower a use cost as
            // your opponent's memory from your hand without paying the cost."
            const oppMemory = Math.max(0, memoryFor(ctx, ctx.game.opponentOf(ownerSeat)));
            const eligibleOptions = tsOptionCandidates(ctx, ownerSeat).filter(
              (c) => (ctx.game.definitionOf(c).playCost ?? 0) <= oppMemory,
            );
            if (eligibleOptions.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: eligibleOptions.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                const chosenCard = eligibleOptions.find((c) => c.instanceId === chosen[0]!);
                const optionCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;
                await ctx.fx.useOptionFromHand(ctx, chosen[0]!, optionCost);
              }
            }

            // "Then, 1 of your Digimon with the [TS] trait may attack."
            const attackers = tsAttackCandidates(ctx, ownerSeat);
            if (attackers.length > 0) {
              const chosenAttacker = await ctx.ask.chooseTargets(ctx, {
                candidates: attackers.map((p) => p.permanentId),
                min: 0,
                max: 1,
              });
              if (chosenAttacker.length > 0) await ctx.fx.forceAttack(chosenAttacker[0]!);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/sec`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};
registerCard(module);
export default module;
