import { EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-063 — Tellermon (BT26, Purple Lv.3 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-063` returns no errata/Q&A hits), so this port is
 * provisional: it follows the printed text directly and mirrors the closest existing
 * hand-written cards for each clause shape. Re-check against the KB once BT26 rulings
 * are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [Your Turn] [Once Per Turn] When this Digimon gets linked, reveal the top 3 cards of
 *     your deck. Add 1 card with the [Entertainment], [Open] or [Seven Code] trait among
 *     them to the hand. Return the rest to the top or bottom of the deck.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Detach＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader; no module clause.
 *   EffectTiming.None — a persistent [Your Turn] watcher installing a `whenLinked`
 *     sub-trigger anchored to this permanent and budgeted by `oncePerTurnKey` for the
 *     printed [Once Per Turn]; see BT26-051 for the shared shape. The reveal / add /
 *     return-the-rest body mirrors the interpreter's own `RevealAdd` sequencing
 *     (interpreter.ts `runRevealAdd`): reveal, take the picks to hand, then let the
 *     controller send the remainder to the top or the bottom as one group.
 *
 * RESIDUAL — link face: this card also carries a printed `linkEffect`:
 *     [When Linking] Delete 1 of your opponent's Digimon with the lowest level.
 *   No BT26 card in this set ports its `linkEffect` (BT26-028 / BT26-037 leave theirs
 *   unported too) and the clause-coverage gate does not read that field, so it is left
 *   unimplemented here for consistency rather than half-modeled. Track it with the
 *   set-wide link-face gap.
 */
const cardId = "BT26-063";

const ADD_TRAITS = ["Entertainment", "Open", "Seven Code"] as const;
const REVEAL_COUNT = 3;

function hasAddTrait(def: CardDefinition): boolean {
  return ADD_TRAITS.some((trait) => cardHasTrait(def, trait));
}

/** "Reveal the top 3 cards of your deck. Add 1 [Entertainment]/[Open]/[Seven Code] card among them to the hand. Return the rest to the top or bottom of the deck." */
async function revealAddAndReturn(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const revealed = await ctx.fx.reveal(ownerSeat, REVEAL_COUNT);
  if (revealed.length === 0) return;

  const taken = new Set<string>();
  const addable = revealed.filter((c) => hasAddTrait(ctx.game.definitionOf(c))).map((c) => c.instanceId);
  if (addable.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: addable,
      visible: revealed.map((c) => c.instanceId),
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      taken.add(chosen[0]!);
      await ctx.fx.returnToHand([chosen[0]!]);
    }
  }

  const rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
  if (rest.length === 0) return;
  const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
  await ctx.fx.returnToDeck(rest, { toTop: choice === 0 });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-linked-reveal-add`,
          description:
            "[Your Turn] [Once Per Turn] When this Digimon gets linked, reveal the top 3 cards " +
            "of your deck. Add 1 card with the [Entertainment], [Open] or [Seven Code] trait " +
            "among them to the hand. Return the rest to the top or bottom of the deck.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${cardId}/when-linked-reveal-add`,
              description: `${cardId}: this Digimon gets linked -> reveal 3 and add 1.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger?.subjectPermanentId === hostId;
              },
              run: async (subCtx) => {
                await revealAddAndReturn(subCtx, ownerSeat);
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
