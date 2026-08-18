import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming, beforePayCost } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT16-065";
const D_BRIGADE = "D-Brigade";
const BOSS = "Boss";
const CHAOSMON = "Chaosmon";
const D_BRIGADE_RETURN_COUNT = 6;

function hasBossTrait(def: CardDefinition): boolean {
  return ((def.types as string[] | undefined) ?? []).includes(BOSS);
}

function hasDbrigadeTrait(def: CardDefinition): boolean {
  return ((def.types as string[] | undefined) ?? []).includes(D_BRIGADE);
}

function isChaosmon(def: CardDefinition): boolean {
  return def.nameEn?.toLowerCase().includes(CHAOSMON.toLowerCase()) ?? false;
}

/** True if any battle-area Digimon (either player) has the [Boss] trait. */
function bossExistsOnField(game: GameAccess): boolean {
  for (const player of [game.player(0 as Seat), game.player(1 as Seat)]) {
    for (const perm of player.battleArea) {
      if (perm.topCard === undefined) continue;
      const def = game.definitionOf(perm.topCard);
      if (isDigimon(def) && hasBossTrait(def)) return true;
    }
  }
  return false;
}

/** Cards with [D-Brigade] trait in `seat`'s trash. */
function dBrigadeTrashInstances(game: GameAccess, seat: Seat): CardInstance[] {
  return game.player(seat).trash.filter((c) => hasDbrigadeTrait(game.definitionOf(c)));
}

/** Opponent's battle-area Digimon permanents. */
function opponentDigimon(game: GameAccess, ownerSeat: Seat): Permanent[] {
  const opponent = game.opponentOf(ownerSeat);
  return game.player(opponent).battleArea.filter(
    (p) => p.topCard !== undefined && isDigimon(game.definitionOf(p.topCard)),
  );
}

/**
 * Core of the reveal-and-delete clause shared by [On Play] and [When Digivolving].
 *
 * 1. Reveal top 3 cards of owner's deck.
 * 2. Player picks 1 Digimon card from them.
 * 3. Delete 1 opponent Digimon with playCost ≤ chosen card's playCost.
 * 4. Trash the remaining revealed cards.
 */
async function resolveRevealAndDelete(ctx: EffectContext): Promise<void> {
  const seat = ctx.source.ownerSeat;
  const revealed = await ctx.fx.reveal(seat, 3);
  if (revealed.length === 0) return;

  // Step 2: Pick 1 Digimon card from the revealed cards.
  const digimonCandidates = revealed
    .filter((c) => isDigimon(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  // If no Digimon was revealed, trash all and return.
  if (digimonCandidates.length === 0) {
    const allIds = revealed.map((c) => c.instanceId);
    if (allIds.length > 0) await ctx.fx.trash(allIds);
    return;
  }

  const [chosenId] = await ctx.ask.selectCards(ctx, {
    candidates: digimonCandidates,
    min: 1,
    max: 1,
  });

  const taken = new Set<string>();
  if (chosenId !== undefined) {
    taken.add(chosenId);
    const chosenDef = ctx.game.definitionOf(
      revealed.find((c) => c.instanceId === chosenId)!,
    );
    const threshold = chosenDef.playCost ?? 0;

    // Step 3: Delete 1 opponent Digimon with playCost ≤ threshold.
    const targets = opponentDigimon(ctx.game, seat).filter((p) => {
      const topDef = ctx.game.definitionOf(p.topCard!);
      return (topDef.playCost ?? 0) <= threshold;
    });
    if (targets.length > 0) {
      const targetIds = targets.map((p) => p.permanentId);
      const [pickedTarget] = await ctx.ask.chooseTargets(ctx, {
        candidates: targetIds,
        min: 1,
        max: 1,
      });
      if (pickedTarget !== undefined) {
        await ctx.fx.deletePermanent([pickedTarget]);
      }
    }
  }

  // Step 4: Trash the remaining revealed cards.
  const rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
  if (rest.length > 0) await ctx.fx.trash(rest);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- BeforePayCost: two optional cost reductions ----------------------
    // Reduction 1: free -6 if any Digimon with [Boss] is on the field.
    // Reduction 2: optional -6 by returning 6 [D-Brigade] cards from trash to deck top.
    // KB Q2655: both can stack for -12 total.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-boss-dbrigade`,
          description:
            "[Your Turn] When this card would be played: if there is a Digimon with [Boss] " +
            "trait, reduce the play cost by 6. By returning 6 cards with [D-Brigade] trait " +
            "from your trash to the top of the deck, reduce the play cost by another 6.",
          when: (ctx) => ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            // Reduction 1: Boss trait anywhere on field → -6 (Q2654: opponent's counts too).
            if (bossExistsOnField(ctx.game)) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 6;
            }

            // Reduction 2: optionally return 6 [D-Brigade] from trash to deck top.
            const dBrigadeCards = dBrigadeTrashInstances(ctx.game, ctx.source.ownerSeat);
            if (dBrigadeCards.length >= D_BRIGADE_RETURN_COUNT) {
              const wantToReturn = await ctx.ask.optional(
                ctx,
                `Return 6 [D-Brigade] cards from your trash to the top of the deck to reduce play cost by 6?`,
              );
              if (wantToReturn) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: dBrigadeCards.map((c) => c.instanceId),
                  min: D_BRIGADE_RETURN_COUNT,
                  max: D_BRIGADE_RETURN_COUNT,
                });
                if (chosen.length === D_BRIGADE_RETURN_COUNT) {
                  await ctx.fx.returnToDeck(chosen, { toTop: true });
                  ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 6;
                }
              }
            }
          },
        }),
      ];
    }

    // ----- [On Play] Reveal 3, pick Digimon, delete opponent Digimon --------
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-delete`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. By selecting 1 Digimon card " +
            "among them, delete 1 of your opponent's Digimon with as high or lower a play " +
            "cost as the selected card. Trash the remaining revealed cards.",
          resolve: async (ctx) => {
            await resolveRevealAndDelete(ctx);
          },
        }),
      ];
    }

    // ----- [When Digivolving] Same as OnPlay --------------------------------
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-reveal-delete`,
          description:
            "[When Digivolving] Reveal the top 3 cards of your deck. By selecting 1 Digimon " +
            "card among them, delete 1 of your opponent's Digimon with as high or lower a play " +
            "cost as the selected card. Trash the remaining revealed cards.",
          resolve: async (ctx) => {
            await resolveRevealAndDelete(ctx);
          },
        }),
      ];
    }

    // ----- [End of Your Turn] Optional DNA Digivolve into Chaosmon ----------
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-your-turn-dna-chaosmon`,
          description:
            "[End of Your Turn] 2 of your Digimon may DNA digivolve into a [Chaosmon] card " +
            "in your hand by paying its DNA digivolve cost.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            // Need at least 2 Digimon on field and at least 1 Chaosmon in hand.
            const myDigimon = ctx.game.player(ctx.source.ownerSeat).battleArea.filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            const chaosmonInHand = ctx.game
              .player(ctx.source.ownerSeat)
              .hand.some((c) => isChaosmon(ctx.game.definitionOf(c)));
            return myDigimon.length >= 2 && chaosmonInHand;
          },
          resolve: async (ctx) => {
            const seat = ctx.source.ownerSeat;
            const myDigimon = ctx.game.player(seat).battleArea.filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            if (myDigimon.length < 2) return;

            const chaosmonInHand = ctx.game
              .player(seat)
              .hand.filter((c) => isChaosmon(ctx.game.definitionOf(c)));
            if (chaosmonInHand.length === 0) return;

            // Pick 2 Digimon as materials.
            const pickedMaterials = await ctx.ask.chooseTargets(ctx, {
              candidates: myDigimon.map((p) => p.permanentId),
              min: 2,
              max: 2,
            });
            if (pickedMaterials.length < 2) return;

            // Pick 1 Chaosmon from hand.
            const [pickedResult] = await ctx.ask.selectCards(ctx, {
              candidates: chaosmonInHand.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (pickedResult === undefined) return;

            await ctx.fx.dnaDigivolveInto(pickedMaterials, pickedResult, { payCost: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
