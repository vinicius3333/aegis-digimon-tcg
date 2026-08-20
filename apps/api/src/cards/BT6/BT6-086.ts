import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-086 — Eosmon (BT6, White Lv.6 Digimon).
 *
 * [When Digivolving] For each Tamer in play, you may place 1 level 5 or lower
 * [Eosmon] from your trash at the top of this Digimon's digivolution cards.
 * If you place 2+, delete 1 opponent Digimon.
 *
 * [Your Turn] This Digimon gets ＜Security Attack +1＞ for every 3 digivolution
 * cards it has.
 */
const cardId = "BT6-086";

function isEosmonLv5OrLower(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.level === undefined || def.level > 5) return false;
  return def.nameEn.includes("Eosmon");
}

function tamerCount(ctx: EffectContext): number {
  let count = 0;
  for (const seat of [0, 1] as const) {
    for (const p of ctx.game.player(seat).battleArea) {
      const def = ctx.game.definitionOf(p.topCard);
      if (def && (def.kinds as string[]).includes("Tamer")) count++;
    }
  }
  return count;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    if (timing === EffectTiming.WhenDigivolving) {
      out.push(
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-eosmon`,
          description:
            "[When Digivolving] For each Tamer in play, you may place 1 level 5 or lower [Eosmon] from your trash at the top of this Digimon's digivolution cards. If you place 2+, delete 1 opponent Digimon.",
          optional: true,
          canActivate: (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            return trash.some((c) => isEosmonLv5OrLower(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            const trash = ctx.game.player(source.ownerSeat).trash;
            const valid = trash.filter((c) => isEosmonLv5OrLower(ctx.game.definitionOf(c)));
            const maxAvailable = valid.length;
            if (maxAvailable === 0) return;
            const maxCount = Math.min(tamerCount(ctx), maxAvailable);
            if (maxCount === 0) return;
            const candidates = valid.map((c) => c.instanceId);
            const selected = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: maxCount });
            if (selected.length === 0) return;
            const reversed = [...selected].reverse();
            await ctx.fx.placeUnder(perm.permanentId, reversed, { belowTop: true });
            if (reversed.length >= 2) {
              const opponentSeat = (1 - source.ownerSeat) as 0 | 1;
              const opponentDigimon = ctx.game
                .player(opponentSeat)
                .battleArea.filter((p) =>
                  (ctx.game.definitionOf(p.topCard)?.kinds as string[] | undefined)?.includes(
                    "Digimon",
                  ),
                );
              if (opponentDigimon.length > 0) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: opponentDigimon.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.deletePermanent([chosen[0]!]);
                }
              }
            }
          },
        }),
      );
    }

    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-sa-boost`,
          description:
            "[Your Turn] This Digimon gets ＜Security Attack +1＞ for every 3 digivolution cards it has.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            const bonus = Math.floor(perm.stack.length / 3);
            if (bonus >= 1) {
              ctx.fx.grantKeyword(
                perm.permanentId,
                "SecurityAttack",
                EffectDuration.UntilOwnerTurnEnd,
                bonus,
              );
            }
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
