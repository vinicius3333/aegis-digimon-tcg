import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-022 — Sorcermon (BT26, Blue/Yellow Lv.4 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-022` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.3 w/[TS] trait: Cost 2
 *   [On Play] [When Digivolving] Add your top security card to the hand and
 *   ＜Recovery +1＞.
 *   [End of Your Turn] If you have a red or purple Digimon, by placing this Digimon as
 *   the bottom security card, you may play 1 blue or red [Iliad] trait Digimon card
 *   from your hand with the cost reduced by 4.
 * Inherited: ＜Barrier＞
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause; already
 *     carried by CardDefinition.evoCosts in cards.json, so it needs no entry here.
 *
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, mandatory) —
 *     "Add your top security card to the hand and ＜Recovery +1＞", modeled on
 *     P-214's shared OnPlay/WhenDigivolving clause shape (two builder entries calling
 *     one resolve function). `ctx.fx.securityToHand(seat, 1, { fromTop: true })` is the
 *     "add your top security card to the hand" primitive; `ctx.fx.recoverToSecurity(seat, 1)`
 *     is ＜Recovery +1＞ (moves the new deck top face-down onto security). Both are
 *     no-ops on an empty stack/deck (BT25-095's `securityToHand` comment), so no extra
 *     condition is needed.
 *
 *   EffectTiming.OnEndTurn — "If you have a red or purple Digimon, by placing this
 *     Digimon as the bottom security card, you may play 1 blue or red [Iliad] trait
 *     Digimon card from your hand with the cost reduced by 4." Cost+optional-play,
 *     modeled on BT26-090's "By suspending this Tamer, you may use 1 Option card ..."
 *     shape: `optional: true` (the builder asks the "may" question), `canActivate`
 *     requires an owned red-or-purple Digimon AND an eligible blue-or-red [Iliad]
 *     Digimon candidate in hand, `resolve` lets the controller pick the target first,
 *     then pays the cost (`ctx.fx.addSecurity(seat, [source.instanceId], { toTop: false })`
 *     — "placing this Digimon as the bottom security card", the same self-to-security
 *     primitive documented for BT25-102), then plays the chosen card
 *     (`ctx.fx.playInstances([id], { payCost: true, costDelta: 4 })`, the generalized
 *     reduced-cost hand play used by EX10-035).
 *
 *   Inherited ＜Barrier＞ — printed keyword, parsed automatically from
 *     inheritedEffectText by the engine's combat/keywords.ts (PRINTED_MATCHERS); needs
 *     no explicit grant (same treatment as BT26-013's ＜Blocker＞).
 */
const cardId = "BT26-022";

function isRedOrPurpleDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && (def.colors.includes(CardColor.Red) || def.colors.includes(CardColor.Purple));
}

function hasRedOrPurpleDigimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return owner.battleArea.some(
    (p) => p.topCard !== undefined && isRedOrPurpleDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

function isBlueOrRedIliadDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (!(def.colors.includes(CardColor.Blue) || def.colors.includes(CardColor.Red))) return false;
  return (def.types ?? []).includes("Iliad");
}

async function addTopSecurityToHandAndRecover(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true });
  await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Add your top security card to the hand and <Recovery +1>.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-security-to-hand-and-recover`,
          description: "[On Play] Add your top security card to the hand and <Recovery +1>.",
          optional: false,
          resolve: async (ctx) => {
            await addTopSecurityToHandAndRecover(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-security-to-hand-and-recover`,
          description: "[When Digivolving] Add your top security card to the hand and <Recovery +1>.",
          optional: false,
          resolve: async (ctx) => {
            await addTopSecurityToHandAndRecover(ctx, source);
          },
        }),
      ];
    }

    // [End of Your Turn] If you have a red or purple Digimon, by placing this Digimon
    // as the bottom security card, you may play 1 blue or red [Iliad] trait Digimon
    // card from your hand with the cost reduced by 4.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-place-as-security-to-play-iliad`,
          description:
            "[End of Your Turn] If you have a red or purple Digimon, by placing this " +
            "Digimon as the bottom security card, you may play 1 blue or red [Iliad] " +
            "trait Digimon card from your hand with the cost reduced by 4.",
          optional: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!hasRedOrPurpleDigimon(ctx, source)) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return owner.hand.some((c) => isBlueOrRedIliadDigimon(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            if (!hasRedOrPurpleDigimon(ctx, source)) return;

            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.hand.filter((c) => isBlueOrRedIliadDigimon(ctx.game.definitionOf(c)));
            if (candidates.length === 0) return;

            let chosenId: string;
            if (candidates.length === 1) {
              chosenId = candidates[0]!.instanceId;
            } else {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenId = chosen[0]!;
            }

            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: false });
            await ctx.fx.playInstances([chosenId], { payCost: true, costDelta: 4 });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
