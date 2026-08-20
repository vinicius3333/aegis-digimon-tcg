import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-075 — Ginkakumon Promote (BT6, Purple Lv.4 Digimon).
 *
 * ＜Rush＞
 *
 * [On Play] You may place 1 [Kinkakumon] and 1 [Ginkakumon] from your trash in
 * this card's digivolution cards in any order. If you place 2 cards with this
 * effect, Draw 1 and gain 1 memory.
 *
 * KB Q1464: only exact name match.
 * KB Q1465: "you may place" — optional to initiate, but once you do, must place
 * as many as possible (mandatory-maximum).
 */
const cardId = "BT6-075";

function isKinkakumon(def: CardDefinition): boolean {
  return def.nameEn === "Kinkakumon";
}

function isGinkakumon(def: CardDefinition): boolean {
  return def.nameEn === "Ginkakumon";
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // ＜Rush＞
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            ctx.fx.grantKeyword(perm.permanentId, "Rush", EffectDuration.Permanent);
          },
        }),
      );
    }

    // [On Play] Place Kinkakumon & Ginkakumon from trash
    if (timing === EffectTiming.OnPlay) {
      out.push(
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-under`,
          description:
            "[On Play] You may place 1 [Kinkakumon] and 1 [Ginkakumon] from your trash as this card's digivolution cards. If you place 2, Draw 1 and gain 1 memory.",
          optional: true,
          canActivate: (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            return (
              trash.some((c) => isKinkakumon(ctx.game.definitionOf(c))) ||
              trash.some((c) => isGinkakumon(ctx.game.definitionOf(c)))
            );
          },
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            const trash = ctx.game.player(source.ownerSeat).trash;
            const kinkaIds = trash
              .filter((c) => isKinkakumon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            const ginkaIds = trash
              .filter((c) => isGinkakumon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            const allCandidates = [...kinkaIds, ...ginkaIds];
            if (allCandidates.length === 0) return;

            // Q1465: accepting the optional effect commits the player to placing as
            // many cards as possible, but never more than one of either exact name.
            // Ask for the first name freely so its choice also sets the requested order;
            // when the other name is available, it is then mandatory.
            const [first] = await ctx.ask.selectCards(ctx, {
              candidates: allCandidates,
              min: 1,
              max: 1,
              visibleCards: trash
                .filter((card) => allCandidates.includes(card.instanceId))
                .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            });
            if (first === undefined) return;
            const otherNameCandidates = kinkaIds.includes(first) ? ginkaIds : kinkaIds;
            const selected = [first];
            if (otherNameCandidates.length > 0) {
              const [second] = await ctx.ask.selectCards(ctx, {
                candidates: otherNameCandidates,
                min: 1,
                max: 1,
                visibleCards: trash
                  .filter((card) => otherNameCandidates.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
              if (second !== undefined) selected.push(second);
            }
            let ordered = selected;
            if (ordered.length > 1 && ctx.ask.orderCards !== undefined) {
              ordered = await ctx.ask.orderCards(ctx, {
                candidates: ordered,
                visibleCards: trash
                  .filter((card) => ordered.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "stackBottom",
              });
            }
            await ctx.fx.placeUnder(perm.permanentId, ordered, { belowTop: true });
            if (selected.length >= 2) {
              await ctx.fx.draw(source.ownerSeat, 1);
              ctx.fx.gainMemory(1);
            }
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
