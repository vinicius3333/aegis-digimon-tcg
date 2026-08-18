import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT11-112 — Kouji Iida (BT11, White Tamer).
 *
 *
 * Printed text (no errata):
 *   [On Play] 1 of your Digimon with [Veemon] or [Veedramon] in its name gains
 *   ＜Blocker＞ and ＜Evade＞ until the end of your opponent's next turn.
 *   [All Turns] When one of your Digimon with [Veedramon] in its name becomes
 *   suspended, by suspending this Tamer, 1 of your Digimon with [Veedramon] in its
 *   name activates one of its [When Digivolving] effects.
 *   [Your Turn][Once Per Turn] When one of your blue Digimon unsuspends, gain 1 memory.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT11-112";

function hasNameCandidate(def: { nameEn: string }, matches: string[]): boolean {
  return matchNameOrTrait(def, { tokens: matches, match: "name" });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Grant Blocker + Evade to a Veemon/Veedramon Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-grant-blocker-evade`,
          description:
            "[On Play] 1 of your Digimon with [Veemon] or [Veedramon] in its name gains " +
            "＜Blocker＞ and ＜Evade＞ until the end of your opponent's next turn.",
          optional: false,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && hasNameCandidate(def, ["Veemon", "Veedramon"]);
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && hasNameCandidate(def, ["Veemon", "Veedramon"]);
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            const selectedId = selected[0];
            if (selectedId !== undefined) {
              ctx.fx.grantKeyword(selectedId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
              ctx.fx.grantKeyword(selectedId, "Evade", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    // [All Turns] When one of your Digimon with [Veedramon] in its name becomes suspended, by
    // suspending this Tamer, that Digimon activates 1 of its [When Digivolving] effects.
    // KB Q2142: the suspend cost is paid (this Tamer still suspends) even when the triggering
    // Digimon has no [When Digivolving] effect to activate. KB Q2143: the target is read
    // LIVE — if it later digivolved into a different card before this resolves, that later
    // card's [When Digivolving] effect activates. `reactivateOnPlay` reads the permanent's
    // CURRENT top card at resolve time, so this falls out for free.
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/veedramon-suspended-reactivate-when-digivolving`,
          description:
            "[All Turns] When one of your Digimon with [Veedramon] in its name becomes " +
            "suspended, by suspending this Tamer, that Digimon activates 1 of its [When " +
            "Digivolving] effects.",
          optional: false,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const suspendedId = ctx.trigger?.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            const perm = ctx.game.permanentById(suspendedId);
            if (perm === undefined || perm.controllerSeat !== source.ownerSeat) return false;
            if (perm.topCard === undefined) return false;
            const def = ctx.game.definitionOf(perm.topCard);
            return isDigimon(def) && hasNameCandidate(def, ["Veedramon"]);
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const suspendedId = ctx.trigger?.suspendedPermanentId;
            if (suspendedId === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;
            await ctx.fx.reactivateOnPlay?.(suspendedId, { timings: [EffectTiming.WhenDigivolving] });
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When your blue Digimon unsuspends, gain 1 memory.
    if (timing === EffectTiming.OnUnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-unsuspend-memory`,
          description: "[Your Turn][Once Per Turn] When one of your blue Digimon unsuspends, gain 1 memory.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea() || !source.isOwnersTurn()) return false;
            const unsuspendedId = ctx.trigger?.unsuspendedPermanentId;
            if (unsuspendedId === undefined) return false;
            const perm = ctx.game.permanentById(unsuspendedId);
            if (perm === undefined || perm.controllerSeat !== source.ownerSeat) return false;
            if (perm.topCard === undefined) return false;
            const def = ctx.game.definitionOf(perm.topCard);
            return isDigimon(def) && def.colors.includes(CardColor.Blue);
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
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
