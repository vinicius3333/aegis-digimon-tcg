import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT4-098 — Spiral Masquerade (BT4, Red Option).
 *
 *
 * [Main] 1 of your Digimon with [Hybrid] in its form gets +3000 DP and
 *   ＜Security Attack +1＞ for the turn. Then, when that Digimon is blocked
 *   this turn, gain 3 memory.
 * [Security] All of your Digimon gain ＜Security Attack +1＞ until the end of
 *   your turn.
 */
const cardId = "BT4-098";

function hasHybridTrait(def: CardDefinition): boolean {
  return (def.forms ?? []).includes("Hybrid");
}

function ownHybridDigimonIds(ctx: EffectContext, ownerSeat: Seat): string[] {
  const player = ctx.game.player(ownerSeat);
  const ids: string[] = [];
  for (const perm of player.battleArea) {
    if (perm.inBreeding) continue;
    if (perm.topCard === undefined) continue;
    const def = ctx.game.definitionOf(perm.topCard);
    if (!isDigimon(def)) continue;
    if (!hasHybridTrait(def)) continue;
    ids.push(perm.permanentId);
  }
  return ids;
}

function ownDigimonIds(ctx: EffectContext, ownerSeat: Seat): string[] {
  const player = ctx.game.player(ownerSeat);
  const ids: string[] = [];
  for (const perm of player.battleArea) {
    if (perm.inBreeding) continue;
    if (perm.topCard === undefined) continue;
    const def = ctx.game.definitionOf(perm.topCard);
    if (!isDigimon(def)) continue;
    ids.push(perm.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Select 1 Hybrid Digimon: +3000 DP, <SA+1>, +sub-trigger for when blocked.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-hybrid-buff`,
          description:
            "[Main] 1 of your Digimon with [Hybrid] in its form gets +3000 DP and " +
            "＜Security Attack +1＞ for the turn. Then, when that Digimon is blocked " +
            "this turn, gain 3 memory.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = ownHybridDigimonIds(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;

            const targetId = chosen[0]!;

            // +3000 DP for the turn.
            ctx.fx.modifyDP(targetId, 3000, EffectDuration.UntilEachTurnEnd);

            // ＜Security Attack +1＞ for the turn.
            ctx.fx.grantKeyword(targetId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);

            // Install sub-trigger: when this Digimon is blocked, gain 3 memory.
            ctx.fx.subscribeSubTrigger({
              event: "whenBlocked",
              sourcePermanentId: targetId,
              once: false,
              expiresOnTurnEndOf: source.ownerSeat,
              description: `${cardId} grant: [Your Turn] When blocked, gain 3 memory`,
              matches: (subCtx) => {
                // Must be the owner's turn and the attacker being blocked is our target.
                if (!subCtx.source.isOwnersTurn()) return false;
                const perm = subCtx.game.permanentById(targetId);
                if (perm === undefined || perm.topCard === undefined) return false;
                return subCtx.trigger.attackerPermanentId === targetId;
              },
              run: async (subCtx) => {
                subCtx.fx.gainMemory(3);
              },
            });
          },
        }),
      ];
    }

    // [Security] All of your Digimon gain ＜Security Attack +1＞ until end of your turn.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-sa-plus`,
          description:
            "[Security] All of your Digimon gain ＜Security Attack +1＞ " +
            "until the end of your turn.",
          optional: false,
          resolve: async (ctx) => {
            const ids = ownDigimonIds(ctx, source.ownerSeat);
            for (const permanentId of ids) {
              ctx.fx.grantKeyword(permanentId, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
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
