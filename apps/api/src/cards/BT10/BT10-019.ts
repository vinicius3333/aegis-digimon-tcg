// @ts-nocheck
import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, onDeletion, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT10-019 — MetalGreymon (BT10, Blue Lv.5 Digimon).
 *
 *
 * Printed text (no errata):
 *   [On Play] Reveal the top 4 cards of your deck. Add 2 cards with [Blue Flare] in
 *   their traits among them to your hand. Place the rest at the bottom of your deck
 *   in any order. If you have a [Kiriha Aonuma] in play, you may return 1 [MetalGreymon]
 *   from your trash to your hand instead.
 *   ＜Save＞
 *   [Inherited][When Attacking][Once Per Turn] If this Digimon has [Blue Flare] in its
 *   traits and your opponent has 2 or more Digimon in play, unsuspend this Digimon.
 */
const cardId = "BT10-019";

function hasBlueFlare(def: { types?: string[] }): boolean {
  const types = def.types as string[] | undefined;
  return (types?.includes("Blue Flare") || types?.includes("BlueFlare")) ?? false;
}

function hasKirihaAonuma(ctx: { game: { player: Function } }, source: CardSource): boolean {
  const owner = (ctx.game as any).player(source.ownerSeat);
  return owner.battleArea.some((p: any) => {
    if (p.topCard === undefined) return false;
    const def = (ctx.game as any).definitionOf(p.topCard);
    return matchNameOrTrait(def, { tokens: ["Kiriha Aonuma"], match: "nameExact" });
  });
}

function isMetalGreymonCard(def: { nameEn: string }): boolean {
  return matchNameOrTrait(def, { tokens: ["MetalGreymon"], match: "nameExact" });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Modal: reveal top 4 -> add Blue Flare, OR return MetalGreymon from trash.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-or-return`,
          description:
            "[On Play] Reveal the top 4 cards of your deck. Add 2 cards with [Blue Flare] in their " +
            "traits among them to your hand. Place the rest at the bottom of your deck in any order. " +
            "If you have a [Kiriha Aonuma] in play, you may return 1 [MetalGreymon] from your trash " +
            "to your hand instead.",
          optional: false,
          canActivate: (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            return (
              owner.deck.length >= 1 ||
              (hasKirihaAonuma(ctx, source) &&
                owner.trash.some((c: any) => isMetalGreymonCard(ctx.game.definitionOf(c))))
            );
          },
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasKiriha = hasKirihaAonuma(ctx, source);
            const hasMetalInTrash = owner.trash.some((c: any) => isMetalGreymonCard(ctx.game.definitionOf(c)));
            const hasDeck = owner.deck.length >= 1;
            const instead = hasKiriha && hasMetalInTrash;

            // §18-2-2 overwrite processing ("instead" text): whenever the "instead"
            // condition (a [Kiriha Aonuma] in play) holds AND its own payload is usable
            // (a [MetalGreymon] in the trash), the player gets to CHOOSE it over the
            // default processing — not only as a fallback when the default has nothing to
            // do. Asked unconditionally on `instead` (independent of `hasDeck`) so the
            // choice is offered even when the default reveal branch also has work to do.
            const fromLibrary = instead
              ? !(await ctx.ask.optional(ctx, "Return 1 [MetalGreymon] from your trash to your hand instead?"))
              : true;

            if (fromLibrary) {
              if (!hasDeck) return;
              const revealed = await ctx.fx.reveal(source.ownerSeat, 4);
              const blueFlare = revealed.filter((c: any) => hasBlueFlare(ctx.game.definitionOf(c)));
              const blueFlareIds = blueFlare.map((c: any) => c.instanceId);

              let selected: string[] = [];
              if (blueFlareIds.length > 0) {
                // Q&A Q1947: the pick is forced, not optional — add as many as possible
                // (up to 2) when eligible candidates exist among the revealed cards.
                const max = Math.min(2, blueFlareIds.length);
                selected = await ctx.ask.selectCards(ctx, {
                  candidates: blueFlareIds,
                  min: max,
                  max,
                  visible: revealed.map((card: any) => card.instanceId),
                  visibleCards: revealed.map((card: any) => ({
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                  })),
                });
              }

              if (selected.length > 0) {
                await ctx.fx.returnToHand(selected);
              }

              let rest = revealed.filter((c: any) => !selected.includes(c.instanceId)).map((c: any) => c.instanceId);

              if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
                rest = await ctx.ask.orderCards(ctx, {
                  candidates: rest,
                  visibleCards: revealed
                    .filter((card: any) => rest.includes(card.instanceId))
                    .map((card: any) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                });
              }
              if (rest.length > 0) {
                await ctx.fx.returnToDeck(rest, { toTop: false });
              }
            } else {
              const metalCandidates = owner.trash
                .filter((c: any) => isMetalGreymonCard(ctx.game.definitionOf(c)))
                .map((c: any) => c.instanceId);

              if (metalCandidates.length === 0) return;

              const selected = await ctx.ask.selectCards(ctx, {
                candidates: metalCandidates,
                min: 0,
                max: 1,
              });

              if (selected.length > 0) {
                await ctx.fx.returnToHand(selected);
              }
            }
          },
        }),
      ];
    }

    // ＜Save＞ On deletion, optionally place under a Tamer.
    if (timing === EffectTiming.OnDeletion) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save`,
          description: "＜Save＞ (On Deletion, you may place this card under a Tamer.)",
          optional: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isTamer(def);
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const tamerIds = owner.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isTamer(def);
              })
              .map((p) => p.permanentId);

            if (tamerIds.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates: tamerIds,
              min: 1,
              max: 1,
            });

            if (selected.length > 0) {
              await ctx.fx.placeUnder(selected[0], [source.instanceId]);
            }
          },
        }),
      ];
    }

    // [Inherited][When Attacking][Once Per Turn] If this has Blue Flare and opponent
    // has 2+ Digimon, unsuspend this Digimon.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-unsuspend`,
          description:
            "[When Attacking][Once Per Turn] If this Digimon has [Blue Flare] in its traits and " +
            "your opponent has 2 or more Digimon in play, unsuspend this Digimon.",
          optional: false,
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const me = source.permanent();
            if (me === undefined || me.topCard === undefined) return false;
            const topDef = ctx.game.definitionOf(me.topCard);
            if (!hasBlueFlare(topDef)) return false;
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return (
              opp.battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                .length >= 2
            );
          },
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me !== undefined) {
              await ctx.fx.unsuspend([me.permanentId]);
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
