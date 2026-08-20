import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-029 — Aegiochusmon: Holy (BT26, Yellow/Black Lv.5 Digimon).
 *
 * The committed KB contains Q6994-Q6995 (2026-08-18), covering security-effect
 * priority and the exact top/bottom stacked-card protection semantics.
 *
 * Printed text:
 *   [Digivolve] [Aegiomon]: Cost 3
 *   ＜Decode ([Aegiomon])＞ ＜Ascension＞
 *   [On Play] [When Digivolving] By trashing your top security card, until your opponent's
 *     turn ends, their effects can't reduce the DP of 1 of your Digimon, trash any of its
 *     stacked cards, or return them to hands or decks.
 *   [All Turns] [Once Per Turn] When your security stack is removed from, 3 of your
 *     opponent's Digimon get -5000 DP for the turn.
 *   [Rule] Trait: Has [Angel] Type.
 *   (inherited) [All Turns] [Once Per Turn] When your security stack is removed from,
 *     ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Decode＞ / ＜Ascension＞ — printed keywords on this card's own text, resolved by the
 *     engine's printed-keyword reader (engine/combat/keywords.ts).
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — the protection clause. "By
 *     trashing your top security card" is a COST paid up front; with no security card
 *     there is nothing to pay and the clause does nothing. The protection maps onto the
 *     two engine substrates that exist:
 *       - "can't reduce the DP" -> `restrict(..., "dpImmune", { byOpponentEffectsOnly })`
 *       - "trash any of its stacked cards ... or return them to hands or decks" ->
 *         `stackTrashLock`, which the digivolution-card trash, De-Digivolve, and direct
 *         stack-return primitives consult against the resolving effect's seat.
 *   EffectTiming.None — the [All Turns] DP watcher and the [Rule] trait grant, plus the
 *     inherited ＜De-Digivolve 1＞ watcher. "Your security stack is removed from" is gated
 *     on `removedFromSecuritySeat === ownerSeat` and covers both removal routes the engine
 *     distinguishes: `whenSecurityRemoved` (a security CHECK) and
 *     `whenEffectRemovesFromSecurity` (an effect trashing security). Each clause uses its
 *     own shared `oncePerTurnKey` across the two watchers so the pair fires at most once
 *     per turn.
 */
const cardId = "BT26-029";

const DP_PENALTY = -5000;
const DP_PENALTY_TARGETS = 3;
const SECURITY_REMOVAL_EVENTS = ["whenSecurityRemoved", "whenEffectRemovesFromSecurity"] as const;

function opponentDigimonIds(ctx: EffectContext, ownerSeat: Seat): string[] {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

/** "3 of your opponent's Digimon get -5000 DP for the turn." */
async function penalizeThreeOpponentDigimon(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = opponentDigimonIds(ctx, ownerSeat);
  if (candidates.length === 0) return;

  const take = Math.min(DP_PENALTY_TARGETS, candidates.length);
  const chosen =
    candidates.length <= take ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: take, max: take });
  for (const id of chosen) {
    ctx.fx.modifyDP(id, DP_PENALTY, EffectDuration.UntilEachTurnEnd);
  }
}

/** "＜De-Digivolve 1＞ 1 of your opponent's Digimon." */
async function deDigivolveOneOpponentDigimon(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = opponentDigimonIds(ctx, ownerSeat);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.deDigivolve(chosen, 1, { byEffectSeat: ownerSeat });
}

/** "By trashing your top security card, until your opponent's turn ends, their effects can't reduce the DP of 1 of your Digimon, trash any of its stacked cards, or return them to hands or decks." */
async function paySecurityAndProtect(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const owner = ctx.game.player(ownerSeat);
  const candidates = owner.battleArea
    .filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const paid = await ctx.fx.trashFromSecurity(ownerSeat, 1, { fromTop: true });
  if (paid.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.restrict(chosen, "dpImmune", EffectDuration.UntilOpponentTurnEnd, {
    byOpponentEffectsOnly: true,
  });
  ctx.fx.stackTrashLock?.(chosen, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-security-protection`,
          description:
            "[On Play] [When Digivolving] By trashing your top security card, until your " +
            "opponent's turn ends, their effects can't reduce the DP of 1 of your Digimon, " +
            "trash any of its stacked cards, or return them to hands or decks.",
          optional: true,
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).security.length > 0 &&
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  !permanent.inBreeding &&
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              ),
          resolve: async (ctx) => paySecurityAndProtect(ctx, source.ownerSeat),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-security-protection`,
          description:
            "[On Play] [When Digivolving] By trashing your top security card, until your " +
            "opponent's turn ends, their effects can't reduce the DP of 1 of your Digimon, " +
            "trash any of its stacked cards, or return them to hands or decks.",
          optional: true,
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).security.length > 0 &&
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  !permanent.inBreeding &&
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              ),
          resolve: async (ctx) => paySecurityAndProtect(ctx, source.ownerSeat),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/decode-aegiomon`,
          description:
            "＜Decode ([Aegiomon])＞ (When this Digimon would leave other than in battle, " +
            "you may play 1 [Aegiomon] from its digivolution cards without paying the cost.)",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "instead",
              description: `${cardId}: Decode ([Aegiomon])`,
              causeAllows: (cause) => cause !== "byBattle",
              appliesTo: (_subCtx, leavingPermanentId) => leavingPermanentId === self.permanentId,
              apply: async (subCtx) => {
                const candidates = self.stack.filter((card: CardInstance) => {
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && def.nameEn.includes("Aegiomon");
                });
                if (candidates.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                  visibleCards: candidates.map(({ instanceId, cardId: id }) => ({ instanceId, cardId: id })),
                });
                if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/security-removed-dp-watchers`,
          description:
            "[All Turns] [Once Per Turn] When your security stack is removed from, 3 of your " +
            "opponent's Digimon get -5000 DP for the turn.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            for (const event of SECURITY_REMOVAL_EVENTS) {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: self.permanentId,
                once: false,
                description: `${cardId}: your security stack is removed from (${event}) -> 3 opponent Digimon -5000 DP.`,
                matches: (subCtx) =>
                  subCtx.source.isOnBattleArea() && subCtx.trigger?.removedFromSecuritySeat === ownerSeat,
                run: async (subCtx) => {
                  await penalizeThreeOpponentDigimon(subCtx, ownerSeat);
                },
              });
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/rule-angel-trait`,
          description: "[Rule] Trait: Has [Angel] Type.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = ctx.source.permanent();
            if (me === undefined) return;
            ctx.fx.grantNameTrait(me.permanentId, "trait", ["Angel"], EffectDuration.Permanent);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-security-removed-dedigivolve`,
          description:
            "[All Turns] [Once Per Turn] When your security stack is removed from, " +
            "＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            for (const event of SECURITY_REMOVAL_EVENTS) {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: self.permanentId,
                once: false,
                description: `${cardId}: your security stack is removed from (${event}) -> ＜De-Digivolve 1＞.`,
                matches: (subCtx) =>
                  subCtx.source.isOnBattleArea() && subCtx.trigger?.removedFromSecuritySeat === ownerSeat,
                run: async (subCtx) => {
                  await deDigivolveOneOpponentDigimon(subCtx, ownerSeat);
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
