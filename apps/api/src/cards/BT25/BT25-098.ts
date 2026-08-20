import { CardKind, EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

// Cyber Engage (BT25-098)
// <Use Req. ([Appmon] trait)>
// [Main] Reveal top 3 of your deck. Add 1 [Appmon] trait to hand, trash the rest.
//        Then place this card in the battle area.
// [Main] <Delay> You may play 1 [Appmon] trait from hand with cost reduced by 3.
// [Security] Place this card in the battle area.
const cardId = "BT25-098";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [],
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
            raw: "you have a card w/[Appmon] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            count: 1,
            upTo: true,
          },
          payCost: true,
          reduceCostBy: 3,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      keywords: [],
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
} as unknown as CompiledCard;

function appmonPermanentsInHand(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).hand)
    .filter((card) => {
      const definition = ctx.game.definitionOf(card);
      return (
        cardHasTrait(definition, "Appmon") &&
        (definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.Tamer))
      );
    })
    .map((card) => card.instanceId);
}

// Keep the declarative implementation for the Use Requirement, initial [Main], and
// [Security] clauses. The activated Delay body is explicit because it must combine
// Delay's physical-source trash cost with the paid effect-play seam; representing the
// reduction as a separate would-be-played replacement made the selected Appmon play for
// free instead of paying printed cost -3 (Q6464).
const baseModule = registerIrCard(cardId, compiled);
unregisterCard(cardId);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnDeclaration) return baseModule.effectsForTiming(timing, source);
    return [
      activated({
        source,
        effectKey: `${cardId}/delay-play-appmon-reduced-3`,
        description:
          "[Main] <Delay> By trashing this card, you may play 1 [Appmon] trait card " +
          "from your hand with the play cost reduced by 3.",
        optional: true,
        when: (ctx) => ctx.source.isOnBattleArea(),
        canActivate: (ctx) => {
          const self = ctx.source.permanent();
          return (
            self !== undefined &&
            self.enterFieldTurnCount !== ctx.game.state.turnCount &&
            appmonPermanentsInHand(ctx, source).length > 0
          );
        },
        resolve: async (ctx) => {
          const self = ctx.source.permanent();
          if (self === undefined || self.enterFieldTurnCount === ctx.game.state.turnCount) return;
          const trashed = await ctx.fx.trash([self.topCard.instanceId], {
            byEffectSeat: source.ownerSeat,
          });
          if (trashed.length !== 1) return;

          const candidates = appmonPermanentsInHand(ctx, source);
          if (candidates.length === 0) return;
          const selected = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          if (selected.length !== 1) return;
          await ctx.fx.playInstances(selected, {
            payCost: true,
            costDelta: 3,
            effectSourceCardId: cardId,
          });
        },
      }),
    ];
  },
};

registerCard(module);
