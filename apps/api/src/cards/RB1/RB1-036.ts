// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-036 Proximamon
// [Digivolve] 3 from [Siriusmon] w/[Arcturusmon] digivolution card
//
// [All Turns][Once Per Turn] When another Digimon is deleted, you may play
//   1 level 4 or lower Digimon card with [Gammamon] in its name from your
//   trash without paying the cost.
// [End of Your Turn][Once Per Turn] By placing 1 Digimon card with [Gammamon]
//   in its text from your hand or trash as this Digimon's bottom digivolution
//   card, delete 1 of your opponent's Digimon with DP less than or equal to
//   this Digimon's DP.
//
// Q&A (Q4112): the DP comparison uses the DP after any inherited-effect
//   increases from cards placed in digivolution cards.
//
// Fixes vs prior IR:
// - sourceFilter for onDeletionOf: removed controllerDefault:'mine' — "another
//   Digimon" = any Digimon (either controller) other than self (excludeSelf:true
//   is the only constraint). Text does not restrict controller.
// - digivolutionRequirement: the shared alternate-requirement override adds the
//   required [Arcturusmon] card in the base's digivolution stack.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Gammamon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Gammamon"],
                    match: "text",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "By placing 1 Digimon card with [Gammamon] in its text from your hand or trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Siriusmon"],
      cost: 3,
      isAlternate: true,
      minNameStackCount: 1,
      minNameStackNames: ["Arcturusmon"],
    },
  ],
};

registerIrCard("RB1-036", compiled);
