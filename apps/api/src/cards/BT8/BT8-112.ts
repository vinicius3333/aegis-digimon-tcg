import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import {
  beforeDigivolveCost,
  whenAttacking,
  whenDigivolving,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT8-112 — Imperialdramon: Paladin Mode (BT8, White Lv.7 Digimon).
 *
 *
 *   EffectTiming.BeforePayCost (lines 13-204): optional — when one of your Digimon
 *     would digivolve into this card in hand, you may return 1 white Lv.7 Digimon
 *     from your trash to the bottom of your deck to reduce the digivolution cost by 4
 *     (rule implementation.UntilCalculateFixedCost, Cost -= 4, added to
 *     UntilCalculateFixedCostEffect only if a card was returned).
 *
 *   EffectTiming.OnEnterFieldAnyone (WhenDigivolving, lines 207-453) and
 *   EffectTiming.OnAllyAttack (WhenAttacking, lines 456-684): SAME body:
 *     1. Optional: return 1 2-color card from THIS Digimon's digivolution stack to the
 *        bottom of its owner's deck (documented behavior: CanSelectCardCondition = CardColors.Count==2 ||
 *        DualCardColors.Count>=2, canNoSelect: true).
 *     2. If a card was returned (returned = true): select 1 opponent Digimon that has
 *        at least 1 trashable digivolution card → trash ALL its digivolution cards.
 *     3. Mandatory: return ALL opponent Digimon with no digivolution cards to the
 *        bottom of their owners' decks (in controller-chosen order when > 1).
 *
 * The BeforePayCost path reduces evo cost by 4 when the optional return fires.
 * Implemented via changeEvoCost(-4) applied transiently in the BeforePayCost window
 * only when the return actually happens (mirrors UntilCalculateFixedCostEffect).
 *
 * The BeforePayCost reducer is marked as a digivolution cost window and installs a
 * one-shot modifier scoped to this card, so it cannot leak into a later digivolution.
 */

const cardId = "BT8-112";

function isWhiteLv7Digimon(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Digimon")) return false;
  if (def.level !== 7) return false;
  return (def.colors as string[]).includes("White");
}

function isTwoColorCard(def: CardDefinition): boolean {
  return def.colors.length >= 2;
}

/** Bodies shared between WhenDigivolving and WhenAttacking. */
async function runBody(ctx: EffectContext, source: CardSource): Promise<void> {
  if (!ctx.source.isOnBattleArea()) return;
  const self = ctx.source.permanent();
  if (self === undefined) return;

  // Step 1: Optional — return 1 2-color card from this Digimon's digivolution stack
  const diviCandidates = self.stack.filter((c) =>
    isTwoColorCard(ctx.game.definitionOf(c)),
  );

  let returned = false;

  if (diviCandidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: diviCandidates.map((c) => c.instanceId),
      min: 0,
      max: 1,
    });
    if (chosen.length > 0) {
      const moved = await ctx.fx.returnToDeck(chosen);
      returned = moved.length > 0;
    }
  }

  // Step 2: Only if step 1 succeeded — trash all digivolution cards of 1 opponent Digimon
  if (returned) {
    const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
    const opponentDigimon = ctx.game.player(opponentSeat).battleArea.filter((p) => {
      if (p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0;
    });

    if (opponentDigimon.length > 0) {
      const targets = opponentDigimon.map((p) => p.permanentId);
      const chosenTarget = await ctx.ask.chooseTargets(ctx, {
        candidates: targets,
        min: 1,
        max: 1,
      });
      if (chosenTarget.length > 0) {
        const hostId = chosenTarget[0]!;
        const hostPermanent = ctx.game.permanentById(hostId);
        if (hostPermanent !== undefined) {
          const diviInstances = hostPermanent.stack.map((c) => c.instanceId);
          if (diviInstances.length > 0) {
            await ctx.fx.trashDigivolutionCards(hostId, diviInstances);
          }
        }
      }
    }
  }

  // Step 3: Mandatory — return ALL opponent Digimon with no digivolution cards to deck bottom
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const noStackOpponents: Permanent[] = ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => {
      if (p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0;
    });

  if (noStackOpponents.length === 0) return;

  // Controller chooses the order
  const orderedIds =
    noStackOpponents.length === 1
      ? [noStackOpponents[0]!.permanentId]
      : await ctx.ask.chooseTargets(ctx, {
          candidates: noStackOpponents.map((p) => p.permanentId),
          min: noStackOpponents.length,
          max: noStackOpponents.length,
        });

  for (const permanentId of orderedIds) {
    const perm = ctx.game.permanentById(permanentId);
    if (perm === undefined || perm.topCard === undefined) continue;
    await ctx.fx.returnToDeck([perm.topCard.instanceId]);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // BeforePayCost: return 1 white Lv7 Digimon from trash to deck bottom → cost -4.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforeDigivolveCost({
          source,
          effectKey: `${cardId}/before-pay-cost-return-white-lv7-reduce-cost`,
          description:
            "When one of your Digimon would digivolve into this card in your hand, " +
            "you may return 1 white level 7 Digimon card from your trash to the bottom " +
            "of your deck to reduce the digivolution cost by 4.",
          optional: true,
          canActivate: (ctx) => {
            // Must have a white Lv7 Digimon in trash
            const owner = ctx.game.player(source.ownerSeat);
            return owner.trash.some((c) => isWhiteLv7Digimon(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.trash
              .filter((c) => isWhiteLv7Digimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });

            if (chosen.length === 0) return;

            const moved = await ctx.fx.returnToDeck(chosen);
            if (moved.length === 0) return;

            // Apply -4 to evo cost for THIS digivolve (UntilCalculateFixedCost)
            ctx.fx.changeEvoCost(
              (match) =>
                match.target.controllerSeat === source.ownerSeat &&
                match.into?.cardId === cardId,
              -4,
              { once: true },
            );
          },
        }),
      ];
    }

    // [When Digivolving] — shared body
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-trash-bounce`,
          description:
            "[When Digivolving] You may return 1 2-color card from this Digimon's " +
            "digivolution cards to the bottom of its owner's deck to trash all of the " +
            "digivolution cards of 1 of your opponent's Digimon. Then, return all of " +
            "your opponent's Digimon with no digivolution cards to the bottom of their " +
            "owners' decks in any order.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await runBody(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking] — same body
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-return-trash-bounce`,
          description:
            "[When Attacking] You may return 1 2-color card from this Digimon's " +
            "digivolution cards to the bottom of its owner's deck to trash all of the " +
            "digivolution cards of 1 of your opponent's Digimon. Then, return all of " +
            "your opponent's Digimon with no digivolution cards to the bottom of their " +
            "owners' decks in any order.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await runBody(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
