import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-027";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 [Maquinamon] and 1 card " +
            "with [Maquinamon] in its text among them to the hand. Return the rest to the " +
            "bottom of the deck. Then, you may link this Digimon or 1 [Maquinamon] in your " +
            "hand to 1 of your other Digimon without paying the cost.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 3);
            if (deckCards.length === 0) return;

            const maquinamonName = deckCards.filter((c) => ctx.game.definitionOf(c).nameEn === "Maquinamon");
            const maquinamonText = deckCards.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn !== "Maquinamon" && def.nameEn.includes("Maquinamon");
            });
            const added: string[] = [];
            if (maquinamonName.length > 0) {
              const chosen1 = await ctx.ask.selectCards(ctx, {
                candidates: maquinamonName.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              added.push(...chosen1);
            }
            if (maquinamonText.length > 0) {
              const remaining = maquinamonText.filter((c) => !added.includes(c.instanceId));
              if (remaining.length > 0) {
                const chosen2 = await ctx.ask.selectCards(ctx, {
                  candidates: remaining.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                added.push(...chosen2);
              }
            }
            const rest = deckCards.filter((c) => !added.includes(c.instanceId));
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(
                rest.map((c) => c.instanceId),
                { toTop: false },
              );
            }

            const selfPerm = source.permanent();
            if (selfPerm === undefined) return;
            const _ownerSeat = source.ownerSeat;
            const otherDigimon = Array.from(owner.battleArea)
              .filter(
                (p) =>
                  p.permanentId !== selfPerm.permanentId &&
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)),
              )
              .map((p) => p.permanentId);
            if (otherDigimon.length > 0) {
              const maquinamonInHand = Array.from(owner.hand).filter(
                (card) => ctx.game.definitionOf(card).nameEn === "Maquinamon",
              );
              const willLink = await ctx.ask.optional(
                ctx,
                "Link this Digimon or a Maquinamon from your hand to 1 of your other Digimon?",
              );
              if (willLink) {
                let linkSource = source.instanceId;
                if (maquinamonInHand.length > 0) {
                  const choice = await ctx.ask.chooseOption(ctx, ["This Digimon", "Maquinamon from hand"]);
                  if (choice === 1) {
                    const picked = await ctx.ask.selectCards(ctx, {
                      candidates: maquinamonInHand.map((card) => card.instanceId),
                      min: 1,
                      max: 1,
                    });
                    if (picked.length === 0) return;
                    linkSource = picked[0]!;
                  }
                }
                const linkTo = await ctx.ask.chooseTargets(ctx, {
                  candidates: otherDigimon,
                  min: 1,
                  max: 1,
                });
                if (linkTo.length > 0) {
                  await ctx.fx.link(linkTo[0]!, [linkSource]);
                }
              }
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
