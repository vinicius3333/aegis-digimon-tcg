import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-103 — Jupitermon: Wrath Mode (BT26, Yellow/Red/Black Lv.7 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-103` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.6 w/[Olympos XII] trait: Cost 5
 *   ＜Piercing＞ ＜Reboot＞ ＜Blocker＞ ＜Succession ([Jupitermon])＞
 *   [When Digivolving] [Counter] [Once Per Turn] Trash your top security card, and
 *     ＜Recovery +2＞ (Place the top 2 cards of your deck as your top security card.)
 *   [All Turns] [Once Per Turn] When security stacks are removed from, 1 of your
 *     opponent's Digimon gets -15000 DP until their turn ends.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Piercing＞ / ＜Reboot＞ / ＜Blocker＞ — printed keywords on this card's own text,
 *     resolved by the engine's printed-keyword reader (engine/combat/keywords.ts).
 *   ＜Succession＞ — KNOWN GAP: the engine has no ＜Succession＞ mechanic (no matcher in
 *     combat/keywords.ts, no primitive), so this keyword is not modeled here. It is
 *     inert rather than wrong: nothing in this module claims to implement it.
 *   EffectTiming.WhenDigivolving — "Trash your top security card, and ＜Recovery +2＞",
 *     [Once Per Turn] via `maxPerTurn: 1`. [Counter] marks the window in which the
 *     printed effect may be used; the engine has no separate counter-timing gate, so
 *     the clause resolves in its ordinary When Digivolving window.
 *   EffectTiming.None — the [All Turns] watcher. "Security stacks" is plural and
 *     unqualified, so it fires for a removal from EITHER player's stack, and it covers
 *     both removal routes the engine distinguishes: `whenSecurityRemoved` (a security
 *     CHECK during an attack) and `whenEffectRemovesFromSecurity` (an effect trashing
 *     security). One shared `oncePerTurnKey` budgets the printed [Once Per Turn] across
 *     both watchers so the pair cannot fire twice in a turn.
 */
const cardId = "BT26-103";

const DP_PENALTY = -15000;
const ONCE_PER_TURN_KEY = `${cardId}/security-removed-dp`;

/** "1 of your opponent's Digimon gets -15000 DP until their turn ends." */
async function penalizeOneOpponentDigimon(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  const candidates = ctx.game
    .player(opponentSeat)
    .battleArea.filter(
      (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
    )
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1
      ? candidates[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.modifyDP(chosen, DP_PENALTY, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-recover`,
          description:
            "[When Digivolving] [Counter] [Once Per Turn] Trash your top security card, and " +
            "＜Recovery +2＞",
          optional: false,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
            await ctx.fx.recoverToSecurity(source.ownerSeat, 2);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-removed-watchers`,
          description:
            "[All Turns] [Once Per Turn] When security stacks are removed from, 1 of your " +
            "opponent's Digimon gets -15000 DP until their turn ends.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            for (const event of ["whenSecurityRemoved", "whenEffectRemovesFromSecurity"] as const) {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: hostId,
                once: false,
                oncePerTurnKey: ONCE_PER_TURN_KEY,
                description: `${cardId}: a security stack is removed from (${event}) -> -15000 DP.`,
                matches: (subCtx) => subCtx.source.isOnBattleArea(),
                run: async (subCtx) => {
                  await penalizeOneOpponentDigimon(subCtx, ownerSeat);
                },
              });
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
