import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX6-073 — Ogudomon (EX6, Purple Lv.7+ Digimon).
 *
 *
 *   None (lines 16-30): alternate digivolve from Lv.5+ [Seven Great Demon Lords] at cost 6.
 *     Handled by the engine via digivolutionRequirement; registered via the IR.
 *
 *   OnEnterFieldAnyone #1 / [When Digivolving] (lines 125-222): You may place up to 7 cards
 *     with different names and [Seven Great Demon Lords] from trash as bottom digivolution
 *     cards. If 4 or more were placed in a SINGLE activation (KB Q3825), delete 1 opponent
 *     Digimon or Tamer.
 *
 *   OnAllyAttack #1 / [When Attacking] — same place-under effect (lines 223-323).
 *
 *   OnAllyAttack #2 / [When Attacking] (lines 324-459): By returning 7 cards with different
 *     names and [Seven Great Demon Lords] from this Digimon's digivolution cards to deck
 *     bottom (all 7 must be returned, KB Q3826), delete up to 7 opponent Digimon/Tamers.
 *     Then trash top (7 - actually_deleted) of opponent's security stack.
 *     KB Q3827: if a deletion is prevented, that counts as 0 deleted → security trash count
 *       stays higher (7 - 0 = 7 if all prevented). deletePermanent() returns actual count.
 *     KB Q6040: the effect continues even if Ogudomon leaves the field during resolution.
 *
 * The "different names" constraint is enforced via the engine's differentNames filter in
 * the IR, but here we enforce it manually for the place-under and return-cost selections.
 *
 */
const cardId = "EX6-073";

function hasSevenGreatDemonLords(def: CardDefinition): boolean {
  return (
    (def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Option)) &&
    (def.types ?? []).includes("Seven Great Demon Lords")
  );
}

function isOpponentDigimonOrTamer(def: CardDefinition): boolean {
  return def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Tamer);
}

/** Select up to `max` from `pool` enforcing different card names. */
async function selectDifferentNames(ctx: EffectContext, pool: CardInstance[], max: number): Promise<CardInstance[]> {
  const selected: CardInstance[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < max; i++) {
    const remaining = pool.filter((c) => {
      if (selected.some((s) => s.instanceId === c.instanceId)) return false;
      const def = ctx.game.definitionOf(c);
      return !usedNames.has(def.nameEn);
    });
    if (remaining.length === 0) break;

    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: remaining.map((c) => c.instanceId),
      min: 0,
      max: 1,
    });
    if (chosen.length === 0) break;

    const picked = pool.find((c) => c.instanceId === chosen[0]);
    if (picked === undefined) break;

    selected.push(picked);
    usedNames.add(ctx.game.definitionOf(picked).nameEn);
  }

  return selected;
}

/** Shared place-under-from-trash logic for [When Digivolving] and [When Attacking] #1. */
async function placeUnderFromTrash(ctx: EffectContext, source: CardSource): Promise<void> {
  const player = ctx.game.player(source.ownerSeat);
  const qualifying = Array.from(player.trash).filter((c) => hasSevenGreatDemonLords(ctx.game.definitionOf(c)));
  if (qualifying.length === 0) return;

  const willDo = await ctx.ask.optional(
    ctx,
    "Place up to 7 [Seven Great Demon Lords] cards with different names from your trash as " +
      "this Digimon's bottom digivolution cards? (4+ placed = delete 1 opponent Digimon/Tamer)",
  );
  if (!willDo) return;

  const chosen = await selectDifferentNames(ctx, qualifying, Math.min(7, qualifying.length));
  if (chosen.length === 0) return;

  const selfPerm = ctx.source.permanent();
  if (selfPerm === undefined) return;

  await ctx.fx.placeUnder(
    selfPerm.permanentId,
    chosen.map((c) => c.instanceId),
  );

  // KB Q3825: 4 or more in a SINGLE activation triggers delete.
  if (chosen.length >= 4) {
    const opponent = ctx.game.opponentOf(source.ownerSeat);
    const opponentPlayer = ctx.game.player(opponent);
    const deleteCandidates = Array.from(opponentPlayer.battleArea)
      .filter((p) => p.topCard !== undefined && isOpponentDigimonOrTamer(ctx.game.definitionOf(p.topCard)))
      .map((p) => p.permanentId);

    if (deleteCandidates.length > 0) {
      const toDelete = await ctx.ask.chooseTargets(ctx, {
        candidates: deleteCandidates,
        min: 1,
        max: 1,
      });
      if (toDelete.length > 0) {
        await ctx.fx.deletePermanent(toDelete);
      }
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Place up to 7 with different names from trash; if 4+ placed, delete 1.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-under`,
          description:
            "[When Digivolving] You may place up to 7 cards with different names and the " +
            "[Seven Great Demon Lords] trait from your trash as this Digimon's bottom " +
            "digivolution cards. If you placed 4 or more cards with this effect, delete " +
            "1 of your opponent's Digimon or Tamers.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await placeUnderFromTrash(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        // [When Attacking] #1: same place-under-from-trash + conditional delete.
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-place-under`,
          description:
            "[When Attacking] You may place up to 7 cards with different names and the " +
            "[Seven Great Demon Lords] trait from your trash as this Digimon's bottom " +
            "digivolution cards. If you placed 4 or more cards with this effect, delete " +
            "1 of your opponent's Digimon or Tamers.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await placeUnderFromTrash(ctx, source);
          },
        }),
        // [When Attacking] #2: By returning 7 [SGDL] (different names) from digivolution stack
        // to deck bottom, delete up to 7 opponent Digimon/Tamers, then trash top (7 - deleted)
        // security.
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-return-delete-security`,
          description:
            "[When Attacking] By returning 7 cards with different names and the " +
            "[Seven Great Demon Lords] trait from this Digimon's digivolution cards to the " +
            "bottom of the deck, delete up to 7 of your opponent's Digimon or Tamers. Then, " +
            "trash the top 7 cards of your opponent's security stack. For each card deleted by " +
            "this effect, reduce the cards trashed by 1.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined) return false;
            // Need exactly 7+ qualifying cards with different names in digivolution stack
            // (KB Q3826: must return all 7 — can't return fewer).
            const qualifying = perm.stack.filter((c) => hasSevenGreatDemonLords(ctx.game.definitionOf(c)));
            const uniqueNames = new Set(qualifying.map((c) => ctx.game.definitionOf(c).nameEn));
            return uniqueNames.size >= 7;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;

            // Select 7 cards with different names from digivolution stack.
            const stackCards = perm.stack.filter((c) => hasSevenGreatDemonLords(ctx.game.definitionOf(c)));

            const willDo = await ctx.ask.optional(
              ctx,
              "By returning 7 [Seven Great Demon Lords] cards with different names from digivolution stack to deck bottom, delete up to 7 opponent Digimon/Tamers?",
            );
            if (!willDo) return;

            const returnChosen = await selectDifferentNames(ctx, stackCards, 7);
            if (returnChosen.length < 7) return;

            // Return all 7 to deck bottom.
            await ctx.fx.returnToDeck(
              returnChosen.map((c) => c.instanceId),
              { toTop: false },
            );

            // Delete up to 7 opponent Digimon/Tamers.
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentPlayer = ctx.game.player(opponent);
            const deleteCandidates = Array.from(opponentPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && isOpponentDigimonOrTamer(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);

            let deletedCount = 0;
            if (deleteCandidates.length > 0) {
              const maxToDelete = Math.min(7, deleteCandidates.length);
              const toDelete = await ctx.ask.chooseTargets(ctx, {
                candidates: deleteCandidates,
                min: 0,
                max: maxToDelete,
              });
              if (toDelete.length > 0) {
                // deletePermanent returns count actually deleted (KB Q3827: prevented = 0).
                deletedCount = await ctx.fx.deletePermanent(toDelete);
              }
            }

            // Trash top (7 - actually_deleted) of opponent security (KB Q3827).
            const securityTrashCount = Math.max(0, 7 - deletedCount);
            if (securityTrashCount > 0) {
              await ctx.fx.trashFromSecurity(opponent, securityTrashCount, { fromTop: true });
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
