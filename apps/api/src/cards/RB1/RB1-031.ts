import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] You may place 1 Digimon card with [Gammamon] in its text from your trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          position: "bottom",
          target: {
            filter: {
              zone: "trash",
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
            from: ["trash"],
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may delete 1 Digimon with a level less than or equal to the number of this Digimon's digivolution cards.",
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 0,
                scaling: {
                  per: 1,
                  unit: "digivolutionCards",
                },
              },
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart: "[On Deletion] You may return 1 Digimon card from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, by trashing 1 [Siriusmon] in your hand, you may play 1 [Proximamon] from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Proximamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Siriusmon"],
                    match: "nameExact",
                  },
                ],
              },
              count: 1,
            },
            raw: "by trashing 1 [Siriusmon] in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: {
                kind: "selfTopHasText",
                filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] },
                raw: "this Digimon has [Gammamon] in its text",
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Gammamon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("RB1-031", compiled);
