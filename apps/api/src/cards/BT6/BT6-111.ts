import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-111 — Alphamon (BT6, Black Lv.6 Digimon).
 *
 * [Security] At the end of the battle, add this card to your hand. Then, if a
 * Digimon with [Royal Knight] or [X-Antibody] in its type is in play, up to 12
 * of your opponent's Digimon can't attack players for the turn.
 *
 * [When Attacking] You may pay up to 5 memory. If you do, this Digimon gets
 * +1000 DP for the turn for each memory paid.
 *
 * [End of Attack] Gain 2 memory.
 *
 * The attack effect presents the legal 0–5 payment choices and applies the
 * matching memory payment and DP bonus atomically.
 */
const cardId = "BT6-111";

const ROYAL_KNIGHT = "Royal Knight";
const X_ANTIBODY = "X-Antibody";

function hasRKorXA(def: CardDefinition): boolean {
  const traits = def.types as string[] | undefined;
  if (!traits) return false;
  return traits.includes(ROYAL_KNIGHT) || traits.includes(X_ANTIBODY);
}

function anyHasRKorXA(ctx: EffectContext): boolean {
  for (const seat of [0, 1] as const) {
    if (
      ctx.game.player(seat).battleArea.some((p) => {
        const def = ctx.game.definitionOf(p.topCard);
        return def && isDigimon(def) && hasRKorXA(def);
      })
    ) {
      return true;
    }
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Security] Add to hand + restrict attacks
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-add-hand-restrict`,
          description:
            "[Security] At end of battle, add this card to your hand. If a [Royal Knight] or [X-Antibody] Digimon is in play, up to 12 opponent Digimon can't attack players for the turn.",
          resolve: async (ctx) => {
            ctx.fx.subscribeSubTrigger({
              event: "whenSecurityBattleEnded",
              sourceInstanceId: source.instanceId,
              sourcePermanentId: source.permanent()?.permanentId,
              once: true,
              description: "BT6-111: add to hand and restrict attacks",
              expiresOnTurnEndOf: source.ownerSeat,
              run: async (subCtx) => {
                await subCtx.fx.returnToHand([source.instanceId]);
                if (anyHasRKorXA(subCtx)) {
                  const opponentSeat = (1 - source.ownerSeat) as 0 | 1;
                  const opponentDigimon = subCtx.game
                    .player(opponentSeat)
                    .battleArea.filter((p) =>
                      (subCtx.game.definitionOf(p.topCard)?.kinds as string[] | undefined)?.includes(
                        "Digimon",
                      ),
                    );
                  if (opponentDigimon.length > 0) {
                    const chosen = await subCtx.ask.chooseTargets(subCtx, {
                      candidates: opponentDigimon.map((p) => p.permanentId),
                      min: 0,
                      max: Math.min(12, opponentDigimon.length),
                    });
                    for (const id of chosen) {
                      subCtx.fx.restrict(id, "attackPlayers", EffectDuration.UntilEachTurnEnd);
                    }
                  }
                }
              },
            });
          },
        }),
      );
    }

    // [When Attacking] Pay up to 5 memory for +1000 DP per memory paid.
    if (timing === EffectTiming.OnAllyAttack) {
      out.push(
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-pay-memory-dp`,
          description:
            "[When Attacking] You may pay up to 5 memory. This Digimon gets +1000 DP for the turn for each memory paid.",
          optional: true,
          when: (ctx) =>
            ctx.source.permanent()?.permanentId === ctx.trigger?.attackerPermanentId,
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            const options = ["Pay 0 memory", "Pay 1 memory", "Pay 2 memory", "Pay 3 memory", "Pay 4 memory", "Pay 5 memory"];
            const paid = await ctx.ask.chooseOption(ctx, options);
            if (paid <= 0) return;
            ctx.fx.gainMemory(-paid);
            ctx.fx.modifyDP(perm.permanentId, paid * 1000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }

    // [End of Attack] Gain 2 memory
    if (timing === EffectTiming.OnEndAttack) {
      out.push({
        effectKey: `${cardId}/end-of-attack-memory`,
        description: "[End of Attack] Gain 2 memory.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) =>
          ctx.source.isOnBattleArea() &&
          ctx.source.permanent()?.permanentId === ctx.trigger?.attackerPermanentId,
        canActivate: () => true,
        resolve: async (ctx) => {
          ctx.fx.gainMemory(2);
        },
      });
    }

    return out;
  },
};

registerCard(module);
export default module;
