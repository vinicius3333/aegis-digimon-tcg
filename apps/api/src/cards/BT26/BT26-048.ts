import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-048 — BloomLordmon (BT26, Green/Yellow Lv.6 Digimon).
 *
 * The committed KB contains Q7050-Q7051 (2026-08-18), confirming that simultaneous
 * trashing activates this effect only once and that a Digimon played by the attack
 * effect can still be suspended for Alliance.
 *
 * Printed text:
 *   [Digivolve] Lv.5 w/[DM] trait: Cost 3
 *   ＜Alliance＞
 *   ＜Vortex＞
 *   [When Digivolving] [When Attacking] By trashing any of your Digimon's bottom
 *   face-down digivolution card, you may play 1 6000 DP or lower [Ver.4] trait
 *   Digimon card from your hand without paying the cost.
 *   [All Turns] When effects trash face-down digivolution cards from your Digimon,
 *   1 of your opponent's Digimon gets -6000 DP for the turn.
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
 *     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
 *     here.
 *
 *   ＜Alliance＞ / ＜Vortex＞ — printed keywords, parsed automatically from effectText by
 *     the engine's combat/keywords.ts (PRINTED_MATCHERS); need no explicit grant (same
 *     treatment as BT26-013's ＜Blocker＞).
 *
 *   EffectTiming.WhenDigivolving / EffectTiming.OnAllyAttack (shared body, mandatory
 *     window, optional cost+play) — "By trashing any of your Digimon's bottom
 *     face-down digivolution card, you may play 1 6000 DP or lower [Ver.4] trait
 *     Digimon card from your hand without paying the cost." Modeled on BT26-090's
 *     "By suspending this Tamer, you may use 1 Option card ..." shape: the controller
 *     picks the hand card FIRST (`min: 0, max: 1` — declining pays no cost at all,
 *     same as BT10-041/EX4-030's free-Option shape), and only on a pick does the cost
 *     resolve. The "bottom face-down digivolution card" of the chosen own-Digimon
 *     target uses BT26-018's `permanent.stack[0]` (bottom) +
 *     `ctx.fx.trashDigivolutionCards(targetId, [bottomCard.instanceId], { byEffectSeat })`
 *     pattern. `ctx.fx.playInstances([chosenId], { payCost: false })` is the
 *     "without paying the cost" hand-play primitive (BT26-030).
 *
 *   EffectTiming.None ([All Turns], continuous) — "When effects trash face-down
 *     digivolution cards from your Digimon, 1 of your opponent's Digimon gets -6000 DP
 *     for the turn." Modeled on EX11-057's `staticModifier` + `subscribeSubTrigger`
 *     shape for an "[All Turns]" reactive ability with no per-turn budget: `when` gates
 *     only `isOnBattleArea()` (no `isOwnersTurn()`, since the trashing effect can
 *     resolve on either player's turn), and the one-shot `resolve` installs a
 *     `once: false` subscription on "onDigivolutionCardsDiscardedBatch" (the batch
 *     SubTrigger fired by `trashDigivolutionCards`, per its own doc comment) filtered to a subject whose
 *     controller IS this card's owner (the mirror of EX11-057's opponent-only filter).
 *     `ctx.fx.modifyDP(targetId, -6000, EffectDuration.UntilEachTurnEnd)` is the "for
 *     the turn" DP penalty (BT26-008's own "for the turn" grant pattern, negated).
 */
const cardId = "BT26-048";

const VER4_TRAIT = "Ver.4";
const MAX_PLAYABLE_DP = 6000;

function isPlayableVer4Digimon(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes(VER4_TRAIT) && def.dp <= MAX_PLAYABLE_DP;
}

function ver4HandCandidates(ctx: EffectContext, ownerSeat: CardSource["ownerSeat"]): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) => isPlayableVer4Digimon(ctx.game.definitionOf(c)));
}

function ownDigimonWithStack(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0,
  );
}

async function chooseOne(ctx: EffectContext, candidates: Permanent[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.permanentId;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  return chosen[0];
}

/**
 * "By trashing any of your Digimon's bottom face-down digivolution card, you may play
 * 1 6000 DP or lower [Ver.4] trait Digimon card from your hand without paying the
 * cost." Shared by [When Digivolving] and [When Attacking]. The hand card is chosen
 * first; declining leaves the cost unpaid.
 */
async function resolveTrashBottomToPlayVer4(ctx: EffectContext, source: CardSource): Promise<void> {
  const handCandidates = ver4HandCandidates(ctx, source.ownerSeat);
  if (handCandidates.length === 0) return;

  const chosenHand = await ctx.ask.selectCards(ctx, {
    candidates: handCandidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosenHand.length === 0) return;

  const stackTargetId = await chooseOne(ctx, ownDigimonWithStack(ctx, source));
  if (stackTargetId === undefined) return;

  const stackTarget = ctx.game.permanentById(stackTargetId);
  if (stackTarget === undefined || stackTarget.stack.length === 0) return;
  const bottomCard = stackTarget.stack[0]!;
  await ctx.fx.trashDigivolutionCards(stackTargetId, [bottomCard.instanceId], {
    byEffectSeat: source.ownerSeat,
  });

  await ctx.fx.playInstances(chosenHand, { payCost: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] By trashing any of your Digimon's bottom face-down
    // digivolution card, you may play 1 6000 DP or lower [Ver.4] trait Digimon card
    // from your hand without paying the cost.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/divi-attack-trash-bottom-to-play-ver4`,
          description:
            "[When Digivolving] [When Attacking] By trashing any of your Digimon's " +
            "bottom face-down digivolution card, you may play 1 6000 DP or lower " +
            "[Ver.4] trait Digimon card from your hand without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            ver4HandCandidates(ctx, source.ownerSeat).length > 0 && ownDigimonWithStack(ctx, source).length > 0,
          resolve: async (ctx) => resolveTrashBottomToPlayVer4(ctx, source),
        }),
      ];
    }

    // [When Attacking] Same clause.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/divi-attack-trash-bottom-to-play-ver4`,
          description:
            "[When Digivolving] [When Attacking] By trashing any of your Digimon's " +
            "bottom face-down digivolution card, you may play 1 6000 DP or lower " +
            "[Ver.4] trait Digimon card from your hand without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            ver4HandCandidates(ctx, source.ownerSeat).length > 0 && ownDigimonWithStack(ctx, source).length > 0,
          resolve: async (ctx) => resolveTrashBottomToPlayVer4(ctx, source),
        }),
      ];
    }

    // [All Turns] When effects trash face-down digivolution cards from your Digimon,
    // 1 of your opponent's Digimon gets -6000 DP for the turn.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-divi-trashed-debuff`,
          description:
            "[All Turns] When effects trash face-down digivolution cards from your " +
            "Digimon, 1 of your opponent's Digimon gets -6000 DP for the turn.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDigivolutionCardsDiscardedBatch",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: -6000 DP for the turn to 1 opponent Digimon when a digivolution card is trashed from one of your Digimon.`,
              matches: (subCtx) => {
                if (subCtx.trigger?.byEffectSeat === undefined) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return false;
                return subject.controllerSeat === source.ownerSeat;
              },
              run: async (subCtx) => {
                const opponentSeat = subCtx.game.opponentOf(source.ownerSeat);
                const opponentTargets = Array.from(subCtx.game.player(opponentSeat).battleArea).filter(
                  (p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)),
                );
                const targetId = await chooseOne(subCtx, opponentTargets);
                if (targetId === undefined) return;
                subCtx.fx.modifyDP(targetId, -6000, EffectDuration.UntilEachTurnEnd);
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
