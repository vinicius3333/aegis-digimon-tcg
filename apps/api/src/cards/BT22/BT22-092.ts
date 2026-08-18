import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT22-092 — Jimmy KEN (BT22, Purple Tamer).
//
// [Start of Your Turn] If you have 2 or less memory, set it to 3.
// [Your Turn] When your Digimon are played or digivolve, if any of them have the [Flame] or
//   [CS] trait, by suspending this Tamer, activate 1 of those Digimon's [Main] effects. If
//   this activated any effect, gain 1 memory.
// [Security] Play this card without paying the cost.
//
// KB (node tools/kb/query.mjs card BT22-092):
//   - Q4961: this fires for a card that DIGIVOLVED into a Flame/CS-trait Digimon too (not
//     just a fresh play).
//   - Q4962: the chosen Digimon's [Main] effect resolves FULLY (including its own
//     "if this activated any effect" sub-clause) before this card's OWN "if this activated
//     any effect, gain 1 memory" is evaluated — a strict sequencing `reactivateOnPlay`'s
//     await already provides.
//   - Q4963: reactivating a [Main][Once Per Turn] effect that already used its turn's
//     activation is not allowed — `reactivateOnPlay`'s `canTrigger`/`canActivate` (which
//     read the shared UseTracker) already enforce this; no separate check needed here.
//
// "[Main]" effects are `EffectTiming.OnDeclaration`.

const cardId = "BT22-092";

function hasFlameOrCsTrait(types: readonly string[] | undefined): boolean {
  if (types === undefined) return false;
  return types.includes("Flame") || types.includes("CS");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description:
            "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            // The `when` gate already guarantees this is the owner's own turn, so the
            // turn-relative `state.memory` is already this Tamer's controller's own value.
            return ctx.game.state.memory <= 2;
          },
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Your Turn] When your Digimon are played or digivolve, if any of them have the
    // [Flame] or [CS] trait, by suspending this Tamer, activate 1 of those Digimon's [Main]
    // effects. If this activated any effect, gain 1 memory.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-flame-cs-reactivate-main`,
          description:
            "[Your Turn] When your Digimon are played or digivolve, if any of them have " +
            "the [Flame] or [CS] trait, by suspending this Tamer, activate 1 of those " +
            "Digimon's [Main] effects. If this activated any effect, gain 1 memory.",
          optional: false,
          when: (ctx) => {
            if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!def.kinds.includes(CardKind.Digimon)) return false;
            return hasFlameOrCsTrait(def.types);
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;

            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            const activated = await ctx.fx.reactivateOnPlay?.(subjectId, {
              timings: [EffectTiming.OnDeclaration],
            });
            if (activated === true) ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
