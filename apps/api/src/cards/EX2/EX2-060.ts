// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, whenAttacking, security } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";

/**
 * EX2-060 — Rika Nonaka (EX2, Yellow Tamer).
 *
 *
 * Authoritative text:
 *   [Start of Your Turn] If your memory is 2 or less, set it to 3.
 *   [Your Turn] When you attack with a Digimon with [Renamon], [Kyubimon], [Taomon], or
 *     [Sakuyamon] in its name, you may suspend this Tamer to use 1 Option card with
 *     [Plug-In] in its name from your hand without paying its memory cost.
 *   [Security] Play this card.
 *
 *   EffectTiming.OnStartTurn: the effect factory.SetMemoryTo3TamerEffect (set memory to 3 if ≤ 2).
 *   EffectTiming.OnAllyAttack: the attacking Digimon must have one of the four names;
 *     CanActivateSuspendCostEffect (this Tamer is unsuspended); suspend self then use
 *     1 [Plug-In] Option from hand without paying cost.
 *   EffectTiming.SecuritySkill: PlaySelfTamerSecurityEffect.
 */
const cardId = "EX2-060";

const ELIGIBLE_NAMES = ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"];

function isEligibleAttacker(def: CardDefinition): boolean {
  return ELIGIBLE_NAMES.some((n) => def.nameEn.includes(n));
}

function isPlugInOption(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Option")) return false;
  return def.nameEn.includes("Plug-In");
}

function plugInCandidates(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isPlugInOption(ctx.game.definitionOf(c)));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Start of Your Turn] If memory ≤ 2, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-set-memory-3`,
          description: "[Start of Your Turn] If your memory is 2 or less, set it to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Your Turn] When you attack with a Digimon with one of the eligible names,
    // you may suspend this Tamer to use 1 [Plug-In] Option from hand without paying its cost.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          attackScope: "ally",
          effectKey: `${cardId}/ally-attack-plug-in-option`,
          description:
            "[Your Turn] When you attack with a Digimon with [Renamon], [Kyubimon], [Taomon], " +
            "or [Sakuyamon] in its name, you may suspend this Tamer to use 1 Option card with " +
            "[Plug-In] in its name from your hand without paying its memory cost.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            // Check if the attacker has one of the eligible names
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            if (attacker === undefined || attacker.topCard === undefined) return false;
            if (attacker.controllerSeat !== ownerSeat) return false;
            return isEligibleAttacker(ctx.game.definitionOf(attacker.topCard));
          },
          canActivate: (ctx) => {
            // This Tamer must be unsuspended to pay the suspend cost
            const perm = ctx.source.permanent();
            if (perm === undefined) return false;
            if (perm.isSuspended) return false;
            // And there must be a [Plug-In] Option in hand
            return plugInCandidates(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            // Cost: suspend this Tamer
            await ctx.fx.suspend([perm.permanentId]);
            // Effect: use 1 [Plug-In] Option from hand without paying cost
            const candidates = plugInCandidates(ctx, ownerSeat);
            if (candidates.length === 0) return;
            const picked = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (picked.length === 0) return;
            const chosenId = picked[0]!;
            const chosenCard = candidates.find((c) => c.instanceId === chosenId);
            const usedCost = chosenCard ? ctx.game.definitionOf(chosenCard).playCost : undefined;
            await ctx.fx.useOptionFromHand(ctx, chosenId, usedCost);
          },
        }),
      ];
    }

    // [Security] Play this card.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          optional: true,
          actions: [
            {
              kind: "UseOptionWithoutCost",
              filter: { controller: "mine", kind: ["Option"], nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] },
              from: ["hand"],
              payCost: false,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
