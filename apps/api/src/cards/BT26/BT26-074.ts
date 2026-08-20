import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, whenAttacking, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-074 — Cerberusmon (BT26, Purple/Black Lv.5 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-074 as of this port
// (`node tools/kb/query.mjs card BT26-074` returned no knowledge-base entries — BT26
// has no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.4 w/[TS] trait: Cost 3 — a digivolution-cost requirement, not an
//     effect clause. The catalog only carries this card's ordinary purple/black Lv.4
//     cost-4 paths; the alternate trait path must be supplied by the shared
//     ALTERNATE_DIGIVOLUTION_OVERRIDES table.
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] If it's your turn, by
//     trashing 1 card in your hand, you may use 1 Option card with the [Titan] trait
//     from your trash with the cost reduced by 2.
//   Inherited: [On Deletion] Delete 1 of your opponent's Digimon with the lowest level.
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving / EffectTiming.OnAllyAttack
//     (shared effectKey, one "Once Per Turn" budget spanning all three timings) — "If
//     it's your turn, by trashing 1 card in your hand, you may use 1 Option card with
//     the [Titan] trait from your trash with the cost reduced by 2." Modeled on
//     BT26-059's shared OnPlay/WhenDigivolving/OnAllyAttack "by trashing 1 card in your
//     hand ... from your trash" shape (choose the target first, then pay the hand-trash
//     cost), with the "use 1 Option ... with the cost reduced by 2" tail modeled on
//     BT26-026's `ctx.fx.gainMemory(-reducedCost)` + `ctx.fx.useOptionFromHand` pair —
//     the established hand-written idiom for "use an Option with a reduced cost" (per
//     BT26-006/012/026/033/049/053/090). `useOptionFromHand` is named for its usual
//     hand-sourced call site, but its lookup and lifecycle are zone-agnostic: it resolves
//     the selected Option's registered [Main] effect, leaves a trash-resident Option in
//     trash unless that effect relocates it, and fires `whenOptionUsed` with the printed
//     use cost. The memory delta here is therefore only the reduced payable cost.
//
//   EffectTiming.OnDestroyedAnyone (onDeletion, isInherited: true) — "[On Deletion]
//     Delete 1 of your opponent's Digimon with the lowest level." Modeled on
//     BT17-028's `onDeletion` + lowest-level-opponent-Digimon target-selection shape.
//     Mandatory ("Delete", not "you may delete"), so `optional: false`.

const cardId = "BT26-074";
const TITAN_TRAIT = "Titan";

function hasTitanTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(TITAN_TRAIT);
}

/** Option cards (including the Option side of a DUAL card) with [Titan] trait in trash. */
function titanOptionTrashCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.trash.filter((c) => {
    const def = ctx.game.definitionOf(c);
    return def.kinds.includes(CardKind.Option) && hasTitanTrait(def);
  });
}

/**
 * "If it's your turn, by trashing 1 card in your hand, you may use 1 Option card with
 * the [Titan] trait from your trash with the cost reduced by 2." Shared by [On Play],
 * [When Digivolving] and [When Attacking], all under one "Once Per Turn" budget.
 */
async function resolveTrashHandToUseTitanOptionFromTrash(
  ctx: EffectContext,
  source: CardSource,
): Promise<void> {
  if (!source.isOwnersTurn()) return;

  const owner = ctx.game.player(source.ownerSeat);
  if (owner.hand.length === 0) return;

  const optionCandidates = titanOptionTrashCandidates(ctx, source);
  if (optionCandidates.length === 0) return;

  let chosenOption: CardInstance;
  if (optionCandidates.length === 1) {
    chosenOption = optionCandidates[0]!;
  } else {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: optionCandidates.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    const match = optionCandidates.find((c) => c.instanceId === chosen[0]!);
    if (match === undefined) return;
    chosenOption = match;
  }

  const chosenCost = await ctx.ask.selectCards(ctx, {
    candidates: owner.hand.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosenCost.length === 0) return;

  const paid = await ctx.fx.trash(chosenCost, { byEffectSeat: source.ownerSeat });
  if (!paid.some((card) => card.instanceId === chosenCost[0])) return;

  const def = ctx.game.definitionOf(chosenOption);
  const reducedCost = Math.max(0, (def.playCost ?? 0) - 2);
  if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
  await ctx.fx.useOptionFromHand(ctx, chosenOption.instanceId, def.playCost);
}

/** Opponent's battle-area Digimon at the lowest printed level among them. */
function opponentLowestLevelDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimon = Array.from(opponent.battleArea).filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(p.topCard);
    return isDigimon(definition) && definition.level !== undefined;
  });
  if (digimon.length === 0) return [];
  const minLevel = Math.min(...digimon.map((p) => ctx.game.definitionOf(p.topCard!).level ?? Infinity));
  return digimon.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? Infinity) === minLevel);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] [Once Per Turn] If it's your turn, by trashing 1 card in your hand, you
    // may use 1 Option card with the [Titan] trait from your trash with the cost
    // reduced by 2.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/trash-hand-use-titan-option-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] If it's your " +
            "turn, by trashing 1 card in your hand, you may use 1 Option card with the " +
            "[Titan] trait from your trash with the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanOptionTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToUseTitanOptionFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/trash-hand-use-titan-option-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] If it's your " +
            "turn, by trashing 1 card in your hand, you may use 1 Option card with the " +
            "[Titan] trait from your trash with the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanOptionTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToUseTitanOptionFromTrash(ctx, source);
          },
        }),
      ];
    }

    // [When Attacking] Same clause, same "Once Per Turn" budget as [On Play].
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/trash-hand-use-titan-option-from-trash`,
          description:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] If it's your " +
            "turn, by trashing 1 card in your hand, you may use 1 Option card with the " +
            "[Titan] trait from your trash with the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game.player(source.ownerSeat).hand.length > 0 &&
            titanOptionTrashCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveTrashHandToUseTitanOptionFromTrash(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [On Deletion] Delete 1 of your opponent's Digimon with the lowest level.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-delete-lowest-level`,
          description: "[On Deletion] Delete 1 of your opponent's Digimon with the lowest level.",
          isInherited: true,
          optional: false,
          canActivate: (ctx) => opponentLowestLevelDigimon(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = opponentLowestLevelDigimon(ctx, source);
            if (candidates.length === 0) return;

            let chosenId: string;
            if (candidates.length === 1) {
              chosenId = candidates[0]!.permanentId;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: candidates.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenId = chosen[0]!;
            }

            await ctx.fx.deletePermanent([chosenId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
