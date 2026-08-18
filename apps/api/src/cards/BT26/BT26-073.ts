import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-073 — Aegiochusmon: Dark (BT26, Purple/Red Lv.5 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-073` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] [Aegiomon]: Cost 3
 *   [Assembly -2] Lv.4 or lower Digimon card w/[Chronomon] in text or w/[TS] trait
 *   [On Play] [When Digivolving] By deleting this Digimon or returning 1 [Shaman] or
 *     [TS] trait card from your trash to the bottom of the deck, delete 1 of your
 *     opponent's level 5 or lower Digimon.
 *   [On Deletion] You may play 1 [TS] trait card with a play cost of 5 or less from your
 *     hand or trash without paying the cost.
 *   [Rule] Trait: Has [Wizard] Type.
 *   (inherited) ＜Security A. +1＞
 *
 * Clause mapping:
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — the cost is an EITHER/OR choice
 *     ("by deleting this Digimon OR returning 1 [Shaman]/[TS] trait card from trash to
 *     deck bottom"): the controller picks which to pay, then deletes 1 opponent Digimon
 *     level <= 5. Modeled as a `chooseOption` between the two cost paths, each gated on
 *     its own legality (self must still be on the field to self-delete; a matching trash
 *     card must exist to pay the alternate cost).
 *   EffectTiming.OnDestroyedAnyone — "You may play 1 [TS] trait card with a play cost of
 *     5 or less from your hand or trash without paying the cost."
 *   EffectTiming.None — the ＜Security A. +1＞ inherited grant (this card's OWN
 *     `effectText` has no printed keyword tag; the tag lives only in
 *     `inheritedEffectText`, so `resolveKeywords`'s printed-text scan of the top card
 *     never picks it up — an explicit `isInherited: true` staticModifier grant is
 *     required, mirroring BT12-063's inherited-Blocker shape) and the "[Rule] Trait: Has
 *     [Wizard] Type" self-trait grant (`ctx.fx.grantNameTrait`, BT26-018 precedent —
 *     `packages/shared/**` is off-limits here, and this card's `types` array
 *     (["Shaman","Iliad","TS"]) is genuinely missing "Wizard", the same kind of data gap
 *     BT26-018 flagged for [Aquatic]).
 */
const cardId = "BT26-073";

function hasShamanOrTs(def: CardDefinition): boolean {
  return cardHasTrait(def, "Shaman") || cardHasTrait(def, "TS");
}

/**
 * "By deleting this Digimon or returning 1 [Shaman] or [TS] trait card from your trash to
 * the bottom of the deck, delete 1 of your opponent's level 5 or lower Digimon."
 */
async function resolveCostThenDelete(
  ctx: import("../../engine/effects/EffectContext.js").EffectContext,
  source: CardSource,
): Promise<void> {
  const self = ctx.source.permanent();
  const owner = ctx.game.player(source.ownerSeat);
  const trashCandidates = owner.trash
    .filter((c) => hasShamanOrTs(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  const canSelfDelete = self !== undefined;
  const canTrashReturn = trashCandidates.length > 0;
  if (!canSelfDelete && !canTrashReturn) return;

  let payBySelfDelete: boolean;
  if (canSelfDelete && canTrashReturn) {
    const choice = await ctx.ask.chooseOption(ctx, [
      "Delete this Digimon",
      "Return 1 [Shaman]/[TS] trait card from your trash to the bottom of the deck",
    ]);
    payBySelfDelete = choice === 0;
  } else {
    payBySelfDelete = canSelfDelete;
  }

  if (payBySelfDelete) {
    if (self === undefined) return;
    await ctx.fx.deletePermanent([self.permanentId]);
  } else {
    const picked = await ctx.ask.selectCards(ctx, { candidates: trashCandidates, min: 1, max: 1 });
    if (picked.length === 0) return;
    await ctx.fx.returnToDeck(picked, { toTop: false });
  }

  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const deleteCandidates = ctx.game
    .player(opponent)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.level ?? 99) <= 5;
    })
    .map((p) => p.permanentId);
  if (deleteCandidates.length === 0) return;
  const chosen =
    deleteCandidates.length === 1
      ? deleteCandidates[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates: deleteCandidates, min: 1, max: 1 }))[0];
  if (chosen !== undefined) await ctx.fx.deletePermanent([chosen]);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-cost-delete`,
          description:
            "[On Play] [When Digivolving] By deleting this Digimon or returning 1 [Shaman] " +
            "or [TS] trait card from your trash to the bottom of the deck, delete 1 of your " +
            "opponent's level 5 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => resolveCostThenDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-cost-delete`,
          description:
            "[On Play] [When Digivolving] By deleting this Digimon or returning 1 [Shaman] " +
            "or [TS] trait card from your trash to the bottom of the deck, delete 1 of your " +
            "opponent's level 5 or lower Digimon.",
          optional: false,
          resolve: async (ctx) => resolveCostThenDelete(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-ts`,
          description:
            "[On Deletion] You may play 1 [TS] trait card with a play cost of 5 or less " +
            "from your hand or trash without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = [...owner.hand, ...owner.trash]
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return cardHasTrait(def, "TS") && def.playCost <= 5;
              })
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const picked = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (picked.length === 0) return;
            await ctx.fx.playInstances(picked, { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-security-attack`,
          description: "＜Security A. +1＞ (inherited)",
          isInherited: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/rule-wizard-trait`,
          description: "[Rule] Trait: Has [Wizard] Type.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantNameTrait(self.permanentId, "trait", ["Wizard"], EffectDuration.Permanent);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
