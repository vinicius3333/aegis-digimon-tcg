import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-021 — Gekomon (BT26, Blue/Purple Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-021` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[TS] trait: Cost 2
 *   [On Play] [When Digivolving] 1 of your [TS] trait Digimon's attack target can't change
 *     for the turn.
 *   [Main] [Once Per Turn] You may play 1 [TS] trait Tamer card from your trash with the
 *     cost reduced by 2.
 *   (inherited) [All Turns] [Once Per Turn] When a Digimon attacks, by trashing 1 card in
 *     your hand, trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — the "attack target can't change"
 *     lock, applied as the engine's own `attackTargetChange` restriction on the chosen
 *     [TS] Digimon (combat/legality.ts honors it) for EffectDuration.UntilEachTurnEnd.
 *   EffectTiming.OnDeclaration — the [Main] activated ability. `playInstances` accepts a
 *     trash-resident instance (its loose lookup spans hand/security/deck/trash), so the
 *     Tamer is played straight from trash with `costDelta: -2`.
 *   EffectTiming.None (isInherited: true) — the [All Turns] watcher, installed as a
 *     `whenAttacking` sub-trigger budgeted by `oncePerTurnKey`. The printed text says "a
 *     Digimon", unqualified, so it is not gated to either player's attacker. "By trashing
 *     1 card in your hand" is a COST: declining it (or holding no card) leaves the trash
 *     half unresolved. `stack` is ordered bottom (index 0) -> top, so the "bottom 2
 *     digivolution cards" are its first two entries.
 */
const cardId = "BT26-021";

const TAMER_COST_REDUCTION = 2;
const BOTTOM_CARDS_TRASHED = 2;

function hasTsTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "TS");
}

/** "1 of your [TS] trait Digimon's attack target can't change for the turn." */
async function lockTsAttackTarget(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const candidates = ctx.game
    .player(ownerSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && hasTsTrait(def);
    })
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1
      ? candidates[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  ctx.fx.restrict(chosen, "attackTargetChange", EffectDuration.UntilEachTurnEnd);
}

/** "By trashing 1 card in your hand, trash the bottom 2 digivolution cards of 1 of your opponent's Digimon." */
async function trashHandThenBottomTwo(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const owner = ctx.game.player(ownerSeat);
  if (owner.hand.length === 0) return;

  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  const targets = ctx.game
    .player(opponentSeat)
    .battleArea.filter(
      (p) =>
        !p.inBreeding &&
        p.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(p.topCard)) &&
        p.stack.length > 0,
    )
    .map((p) => p.permanentId);
  if (targets.length === 0) return;

  const paid = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (paid.length === 0) return;
  await ctx.fx.trash(paid);

  const chosen =
    targets.length === 1
      ? targets[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;

  const host = ctx.game.permanentById(chosen);
  if (host === undefined) return;
  const bottom = host.stack.slice(0, BOTTOM_CARDS_TRASHED).map((c) => c.instanceId);
  if (bottom.length === 0) return;
  await ctx.fx.trashDigivolutionCards(chosen, bottom, { byEffectSeat: ownerSeat });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-attack-target-lock`,
          description:
            "[On Play] [When Digivolving] 1 of your [TS] trait Digimon's attack target can't " +
            "change for the turn.",
          optional: false,
          resolve: async (ctx) => lockTsAttackTarget(ctx, source.ownerSeat),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-attack-target-lock`,
          description:
            "[On Play] [When Digivolving] 1 of your [TS] trait Digimon's attack target can't " +
            "change for the turn.",
          optional: false,
          resolve: async (ctx) => lockTsAttackTarget(ctx, source.ownerSeat),
        }),
      ];
    }

    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play-ts-tamer-from-trash`,
          description:
            "[Main] [Once Per Turn] You may play 1 [TS] trait Tamer card from your trash with " +
            "the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.trash
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isTamer(def) && hasTsTrait(def);
              })
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.playInstances([chosen[0]!], { costDelta: -TAMER_COST_REDUCTION });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-attack-trash-bottom`,
          description:
            "[All Turns] [Once Per Turn] When a Digimon attacks, by trashing 1 card in your " +
            "hand, trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/inherited-attack-trash-bottom`,
              description: `${cardId}: a Digimon attacks -> may trash 1 hand card to trash 2 bottom digivolution cards.`,
              matches: (subCtx) => subCtx.source.isOnBattleArea(),
              run: async (subCtx) => {
                await trashHandThenBottomTwo(subCtx, ownerSeat);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
