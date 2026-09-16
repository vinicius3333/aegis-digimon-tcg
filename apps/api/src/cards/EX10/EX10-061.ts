import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              amountPerPlaced: 4,
              raw: "reduce the play cost by 4 for each card placed",
            },
          ],
          cost: {
            kind: "place",
            optional: true,
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                faceUp: true,
                nameOrTrait: [
                  {
                    tokens: ["Dark Masters"],
                    match: "trait",
                  },
                ],
              },
              count: "all",
              distinctNames: true,
            },
            underFilter: {
              isSelfRef: true,
            },
            raw: "by placing 1 of each face-up [Dark Masters] trait card with different names from your security stack under this card, reduce the play cost by 4 for each card placed",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 of each [Dark Masters] trait card with different names from this Digimon's digivolution cards without paying the costs.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              source: "digivolutionCards",
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
            distinctNames: true,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, all of your [Dark Masters] trait Digimon gain ＜Rush＞ for the turn. At turn end, delete the Digimon this effect played.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 of each [Dark Masters] trait card with different names from this Digimon's digivolution cards without paying the costs.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              source: "digivolutionCards",
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
            distinctNames: true,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, all of your [Dark Masters] trait Digimon gain ＜Rush＞ for the turn. At turn end, delete the Digimon this effect played.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "DelayedDelete",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Dark Masters"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-061", compiled);

export { compiled };
