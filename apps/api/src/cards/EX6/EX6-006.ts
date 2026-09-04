import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX6-006 (Gate of Deadly Sins).
// The breeding-area effects and mutually exclusive inherited cost reductions are represented
// directly in the runtime record.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          fromEggDeck: true,
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Seven Great Demon Lords"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          underFilter: {
            isSelfRef: true,
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect deleted",
          },
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Ogudomon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By deleting this Digimon with 7 or more cards with different names in its digivolution cards",
          },
          condition: {
            kind: "selfDigivolutionStackDistinctNameCount",
            op: "gte",
            value: 7,
            raw: "this Digimon has 7 or more cards with different names in its digivolution cards",
          },
          optional: true,
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Seven Great Demon Lords"],
                match: "trait",
              },
            ],
          },
          mode: "reduceCost",
          optional: true,
          amountChoices: [
            {
              amount: 3,
              raw: "Reduce the play cost by 3.",
            },
            {
              amount: 4,
              raw: "Reduce the play cost by 4.",
              condition: {
                kind: "selfDigivolutionStackDistinctNameCount",
                op: "gte",
                value: 5,
                raw: "this Digimon has 5 or more cards with different names in its digivolution cards",
              },
            },
          ],
          raw: "When one of your Digimon with the [Seven Great Demon Lords] trait would be played, you may reduce the play cost by 3. If this Digimon has 5 or more cards with different names in its digivolution cards, you may reduce the play cost by 4 instead.",
        },
      ],
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-006", compiled);
