import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart:
            "Then, you may place 1 Digimon card with [Gammamon] in its name from your trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart:
            "Then, you may place 1 Digimon card with [Gammamon] in its name from your trash as this Digimon's bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Regulusmon"], match: "nameExact" }],
              },
              from: ["hand", "trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gammamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-042", compiled);

export { compiled };
