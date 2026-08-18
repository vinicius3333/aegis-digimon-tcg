import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT6-042";

const isRosemon = (def: CardDefinition): boolean =>
  def.nameEn === "Rosemon" || def.nameEn.includes("Rosemon");

const isYellowLv3Digimon = (def: CardDefinition): boolean =>
  isDigimon(def) &&
  def.colors.includes(CardColor.Yellow) &&
  def.level === 3;

function rosemonCandidates(ctx: EffectContext, ownerSeat: number): string[] {
  return ctx.game
    .player(ownerSeat as 0 | 1)
    .hand.filter((c) => isRosemon(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
}

function yellowLv3Candidates(ctx: EffectContext, ownerSeat: number): string[] {
  return ctx.game
    .player(ownerSeat as 0 | 1)
    .hand.filter((c) => isYellowLv3Digimon(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDestroyedAnyone) return [];

    return [
      onDeletion({
        source,
        effectKey: `${cardId}/on-deletion-play-rosemon-or-yellow-lv3`,
        description:
          "[On Deletion] You may play 1 [Rosemon] or up to 2 yellow level 3 Digimon cards " +
          "from your hand without paying their memory costs.",
        optional: true,
        canActivate: (ctx) => {
          const owner = ctx.game.player(source.ownerSeat);
          if (owner.hand.length === 0) return false;
          const hasRosemon = owner.hand.some((c) => isRosemon(ctx.game.definitionOf(c)));
          const hasYellowLv3 = owner.hand.some((c) =>
            isYellowLv3Digimon(ctx.game.definitionOf(c)),
          );
          return hasRosemon || hasYellowLv3;
        },
        resolve: async (ctx) => {
          const rosemon = rosemonCandidates(ctx, source.ownerSeat);
          const yellowLv3 = yellowLv3Candidates(ctx, source.ownerSeat);
          if (rosemon.length === 0 && yellowLv3.length === 0) return;

          let pool: string[];
          let max: number;
          if (rosemon.length > 0 && yellowLv3.length > 0) {
            const branch = await ctx.ask.chooseOption(ctx, [
              "Play 1 [Rosemon]",
              "Play up to 2 yellow level 3 Digimon",
            ]);
            pool = branch === 0 ? rosemon : yellowLv3;
            max = branch === 0 ? 1 : Math.min(2, yellowLv3.length);
          } else if (rosemon.length > 0) {
            pool = rosemon;
            max = 1;
          } else {
            pool = yellowLv3;
            max = Math.min(2, yellowLv3.length);
          }

          const toPlay = await ctx.ask.selectCards(ctx, {
            candidates: pool,
            min: 1,
            max,
          });

          if (toPlay.length > 0) {
            await ctx.fx.playInstances(toPlay, { payCost: false });
          }
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
