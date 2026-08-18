import { CardColor, CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-027";

function ownDigimonWithLv3InStack(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard === undefined) return false;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return p.stack.some((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon) && def.level === 3;
    });
  });
}

function lv3DigimonInStack(permanent: Permanent, ctx: EffectContext): string[] {
  return permanent.stack
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon) && def.level === 3;
    })
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/play-lv3-from-digivolution`,
          description:
            "[On Play] You may play 1 level 3 Digimon card from one of your Digimon's " +
            "digivolution cards as another Digimon without paying its memory cost. If you " +
            "do, you may place 1 blue Digimon card from your hand at the bottom of one of " +
            "your Digimon's digivolution cards.",
          optional: true,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ownDigimonWithLv3InStack(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const hosts = ownDigimonWithLv3InStack(ctx, source);
            if (hosts.length === 0) return;

            // Select 1 host Digimon
            const hostIds = hosts.map((p) => p.permanentId);
            const chosenHostId =
              hostIds.length === 1
                ? hostIds[0]!
                : (await ctx.ask.chooseTargets(ctx, {
                    candidates: hostIds,
                    min: 0,
                    max: 1,
                  }))[0];
            if (!chosenHostId) return;

            const host = hosts.find((p) => p.permanentId === chosenHostId);
            if (!host) return;

            const eligibleInstances = lv3DigimonInStack(host, ctx);
            if (eligibleInstances.length === 0) return;

            // Select 1 Lv.3 Digimon from that stack (optional: canNoSelect)
            const maxSelect = Math.min(1, eligibleInstances.length);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: eligibleInstances,
              min: 0,
              max: maxSelect,
            });
            if (selected.length === 0) return;

            // Play without cost, unsuspended
            const playedPermanents = await ctx.fx.playInstances(selected, {
              payCost: false,
              suspended: false,
            });

            // "If you do" — check that at least one played card is now on the field
            const didPlay = playedPermanents.some((p) => p.topCard !== undefined);
            if (!didPlay) return;

            // Second action: optionally place 1 blue Digimon from hand under a Digimon
            const ownDigimonIds = ctx.game.player(source.ownerSeat).battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                return isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (ownDigimonIds.length === 0) return;

            const hand = ctx.game.player(source.ownerSeat).hand;
            const blueDigimonInHand = hand
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return (
                  def.kinds.includes(CardKind.Digimon) &&
                  def.colors.includes(CardColor.Blue)
                );
              })
              .map((c) => c.instanceId);

            if (blueDigimonInHand.length === 0) return;

            // Select 1 blue Digimon from hand (optional)
            const selectedCard = await ctx.ask.selectCards(ctx, {
              candidates: blueDigimonInHand,
              min: 0,
              max: 1,
            });
            if (selectedCard.length === 0) return;

            // Select target Digimon to place under
            const chosenTargetId =
              ownDigimonIds.length === 1
                ? ownDigimonIds[0]!
                : (await ctx.ask.chooseTargets(ctx, {
                    candidates: ownDigimonIds,
                    min: 0,
                    max: 1,
                  }))[0];
            if (!chosenTargetId) return;

            await ctx.fx.placeUnder(chosenTargetId, selectedCard);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
