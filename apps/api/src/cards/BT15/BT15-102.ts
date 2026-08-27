// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { registerIrCard, registerWouldBePlayedSelfReducer } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 4,
              raw: "reduce the play cost by 4 for each [Dark Masters] trait card placed by this cost",
              cost: {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Dark Masters"],
                        match: "trait",
                      },
                    ],
                    distinctNames: true,
                    zone: "trashOrBattleArea",
                  },
                  count: 3,
                  upTo: true,
                  from: ["battleArea", "trash"],
                },
                raw: "by placing up to 3 [Dark Masters] trait cards with different names from your battle area or trash under it",
                trackCount: "placedDarkMasters",
              },
              optional: true,
              abortOnDecline: true,
              amountPerPlaced: 4,
              scaling: {
                per: 1,
                countSource: "placedDarkMasters",
                unit: "cards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "ActivateEffect",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effectType: "OnPlay",
          count: 1,
          asEffectOf: "this Digimon",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 level 6 or lower card from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "TrashTopDeck",
          controller: "opponent",
          amount: 2,
          optional: false,
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
              levels: [6],
            },
            unit: "digivolutionCards",
          },
          raw: "trash the top 2 cards of your opponent's deck for each of this Digimon's level 6 digivolution cards",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-102", compiled);

// The IR's `wouldBePlayed reduceCost` record is inert on the play path (pay-time reductions run
// through the BeforePayCost self-reducer seam), so the placement cost is hand-written here — the
// BT12-112 pattern. KB Q2599: battle-area sources offer only their TOP card (the rest of that
// permanent's cards are trashed via `shedOwnCards`); KB Q6241: any [Dark Masters] trait battle-area
// card qualifies, Options included.
registerWouldBePlayedSelfReducer("BT15-102", {
  amount: 0,
  amountPerPaid: 4,
  raw: "By placing up to 3 [Dark Masters] trait cards with different names from your battle area or trash under it, reduce the play cost by 4 for each one.",
  pay: async (ctx) => {
    const player = ctx.game.player(ctx.source.ownerSeat);
    const placedNames = new Set();
    const chosenInstanceIds = new Set();
    const chosenPermanentIds = new Set();
    let placedCount = 0;
    for (let pick = 0; pick < 3; pick += 1) {
      const trashCandidates = player.trash.filter(
        (card) =>
          !chosenInstanceIds.has(card.instanceId) &&
          cardHasTrait(ctx.game.definitionOf(card), "Dark Masters") &&
          !placedNames.has(ctx.game.definitionOf(card).nameEn),
      );
      const permanentCandidates = player.battleArea.filter(
        (permanent) =>
          permanent.topCard !== undefined &&
          !chosenPermanentIds.has(permanent.permanentId) &&
          cardHasTrait(ctx.game.definitionOf(permanent.topCard), "Dark Masters") &&
          !placedNames.has(ctx.game.definitionOf(permanent.topCard).nameEn),
      );
      const cards = [...trashCandidates, ...permanentCandidates.map((permanent) => permanent.topCard)];
      if (cards.length === 0) break;
      const [chosenId] = await ctx.ask.selectCards(ctx, {
        candidates: cards.map(({ instanceId }) => instanceId),
        min: 0,
        max: 1,
        visibleCards: cards.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
      });
      if (chosenId === undefined) break;
      const fromBattleArea = permanentCandidates.find((permanent) => permanent.topCard.instanceId === chosenId);
      if (fromBattleArea !== undefined) {
        chosenPermanentIds.add(fromBattleArea.permanentId);
        placedNames.add(ctx.game.definitionOf(fromBattleArea.topCard).nameEn);
        ctx.pendingSelfReducerRelocations = [
          ...(ctx.pendingSelfReducerRelocations ?? []),
          { permanentId: fromBattleArea.permanentId, shedOwnCards: true },
        ];
      } else {
        const chosenCard = trashCandidates.find(({ instanceId }) => instanceId === chosenId);
        chosenInstanceIds.add(chosenId);
        placedNames.add(ctx.game.definitionOf(chosenCard).nameEn);
        ctx.pendingSelfReducerPlacements = [...(ctx.pendingSelfReducerPlacements ?? []), chosenId];
      }
      placedCount += 1;
    }
    return placedCount;
  },
});

export { compiled };
