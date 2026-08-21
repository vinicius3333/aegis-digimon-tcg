// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT15-098 — Night Raid (BT15, Black Option).
 *
 *
 * Printed text (no errata):
 *   [Main] By deleting 1 of your Digimon, you may play 1 [Myotismon] from your trash
 *   without paying the cost. Then, place this card in the battle area.
 *   ＜Delay＞
 *   ·You may play 1 [VenomMyotismon] from your trash without paying the cost.
 *   [All Turns] When one of your [Myotismon] is deleted, place this card in the
 *   battle area.
 *   [Security] Place this card in the battle area.
 *
 */
const cardId = "BT15-098";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Delete own Digimon, then play Myotismon from trash, then place in battle area.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete-then-play`,
          description:
            "[Main] By deleting 1 of your Digimon, you may play 1 [Myotismon] from your " +
            "trash without paying the cost. Then, place this card in the battle area.",
          optional: false,
          canActivate: (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some(
              (p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            const ownDigiIds = owner.battleArea
              .filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);

            if (ownDigiIds.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates: ownDigiIds,
              min: 1,
              max: 1,
            });

            if (selected.length === 0) return;

            await ctx.fx.deletePermanent(selected);

            // Optionally play Myotismon from trash.
            const myotismonInTrash = owner.trash.filter((c: any) =>
              matchNameOrTrait(ctx.game.definitionOf(c), { tokens: ["Myotismon"], match: "nameExact" }),
            );
            if (myotismonInTrash.length > 0) {
              const playSel = await ctx.ask.selectCards(ctx, {
                candidates: myotismonInTrash.map((c: any) => c.instanceId),
                min: 0,
                max: 1,
              });

              if (playSel.length > 0) {
                await ctx.fx.playInstances(playSel, { payCost: false });
              }
            }

            // Place this card in the battle area as an Option permanent.
            await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
          },
        }),
      ];
    }

    // [Security] Place this card in the battle area.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-place`,
          description: "[Security] Place this card in the battle area.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
