import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT8-040";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.WhenDigivolving) return [];

    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/when-digivolving-trash-for-colors-draw`,
        description:
          "[When Digivolving] You may trash 1 card in your hand to treat this Digimon as " +
          "also having the colors of the trashed card for the turn. Then, if this Digimon " +
          "has 2 or more colors, <Draw 2>.",
        optional: false,
        canActivate: (ctx) => {
          if (!ctx.source.isOnBattleArea()) return false;
          return ctx.game.player(ctx.source.ownerSeat).hand.length >= 1;
        },
        resolve: async (ctx) => {
          if (!ctx.source.isOnBattleArea()) return;
          const owner = ctx.game.player(ctx.source.ownerSeat);
          if (owner.hand.length === 0) return;

          // Optional: trash 1 hand card (canNoSelect: true — player may decline)
          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: owner.hand.map((c) => c.instanceId),
            min: 0,
            max: 1,
          });

          if (chosen.length === 0) return;

          const trashed = await ctx.fx.trash(chosen);
          if (trashed.length === 0) return;

          const trashedCard = trashed[0]!;
          const trashedDef = ctx.game.definitionOf(trashedCard);
          const grantedColors = trashedDef.colors as CardColor[];

          const self = ctx.source.permanent();
          if (self === undefined) return;

          // Grant each color of the trashed card to this Digimon until turn end
          for (const color of grantedColors) {
            ctx.fx.addColorGrant(self.permanentId, color, EffectDuration.UntilEachTurnEnd);
          }

          // Draw-2 gate: count effective colors (printed ∪ granted)
          const selfDef = ctx.game.definitionOf(self.topCard!);
          const effectiveColors = new Set<string>(selfDef.colors as CardColor[]);
          for (const c of grantedColors) {
            effectiveColors.add(c);
          }

          if (effectiveColors.size >= 2) {
            await ctx.fx.draw(ctx.source.ownerSeat, 2);
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
