import { CardColor, CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST16-13 — SkullMammothmon (ST16, Purple Lv.6 Digimon).
 *
 *
 * [When Digivolving] <Draw 1>. Then, trash 1 card in your hand.
 * [All Turns][Once Per Turn] When one of your effects trashes a card in your hand,
 *   you may play 1 level 4 or lower purple Digimon card from your trash without
 *   paying the cost.
 *
 *   EffectTiming.OnEnterFieldAnyone (WhenDigivolving) → draw + hand trash.
 *   EffectTiming.OnDiscardHand → SubTrigger(whenHandTrashed), once per turn.
 */

const cardId = "ST16-13";

const isEligibleTrashPlay = (def: CardDefinition): boolean => {
  if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
  if (!def.colors.includes(CardColor.Purple)) return false;
  if (def.level === undefined || def.level === null) return false;
  return def.level <= 4;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [When Digivolving] Draw 1, then trash 1 from hand (documented behavior)
    if (timing === EffectTiming.WhenDigivolving) {
      out.push(
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-trash`,
          description:
            "[When Digivolving] Draw 1. Then, trash 1 card in your hand.",
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);

            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length >= 1) {
              const picks = await ctx.ask.selectCards(ctx, {
                candidates: owner.hand.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (picks.length > 0) {
                await ctx.fx.trash(picks);
              }
            }
          },
        }),
      );
    }

    // [All Turns][Once Per Turn] whenHandTrashed → play Lv.4-or-lower Purple from trash
    // subscribeSubTrigger(whenHandTrashed), maxPerTurn: 1 on the host effect.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/hand-trashed-play-from-trash`,
          description:
            "[All Turns][Once Per Turn] When one of your effects trashes a card in your hand, " +
            "you may play 1 level 4 or lower purple Digimon from your trash without paying the cost.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/hand-trashed-play-from-trash`,
              description: `${cardId}: hand trashed → play Lv.4-or-lower purple from trash`,
                matches: (subCtx) =>
                subCtx.trigger?.handTrashedSeat === source.ownerSeat &&
                subCtx.trigger?.byEffectSeat === source.ownerSeat,
              run: async (subCtx) => {
                const host = subCtx.source.permanent();
                if (host === undefined) return;

                const owner = subCtx.game.player(source.ownerSeat);
                const candidates = owner.trash.filter((c) =>
                  isEligibleTrashPlay(subCtx.game.definitionOf(c)),
                );
                if (candidates.length === 0) return;

                const willPlay = await subCtx.ask.optional(
                  subCtx,
                  "Play 1 level 4 or lower purple Digimon from your trash without paying the cost?",
                );
                if (!willPlay) return;

                const picks = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (picks.length > 0) {
                  await subCtx.fx.playInstances(picks, { payCost: false });
                }
              },
            });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
