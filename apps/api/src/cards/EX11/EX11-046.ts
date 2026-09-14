import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [
    { namesExact: ["Snatchmon"], cost: 9, isAlternate: true },
    { namesExact: ["Galacticmon"], cost: 5, isAlternate: true },
  ],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Choose 1 of your opponent's highest play cost Digimon and delete all of their other Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            except: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
              selector: "highestPlayCost",
            },
          },
        },
        {
          effectTextPart:
            "Then, if this Digimon has 4 or more [Vemmon] in its digivolution cards, until your opponent's turn ends, it gains ＜Blocker＞ and isn't affected by their effects.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digivolutionCardCount",
            nameOrTrait: [
              {
                tokens: ["Vemmon"],
                match: "nameExact",
              },
            ],
            op: "gte",
            value: 4,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          // "isn't affected by THEIR effects" — the opponent's effects, all card kinds.
          immuneFrom: "opponentEffects",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digivolutionCardCount",
            nameOrTrait: [
              {
                tokens: ["Vemmon"],
                match: "nameExact",
              },
            ],
            op: "gte",
            value: 4,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Choose 1 of your opponent's highest play cost Digimon and delete all of their other Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            except: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
              selector: "highestPlayCost",
            },
          },
        },
        {
          effectTextPart:
            "Then, if this Digimon has 4 or more [Vemmon] in its digivolution cards, until your opponent's turn ends, it gains ＜Blocker＞ and isn't affected by their effects.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digivolutionCardCount",
            nameOrTrait: [
              {
                tokens: ["Vemmon"],
                match: "nameExact",
              },
            ],
            op: "gte",
            value: 4,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          // "isn't affected by THEIR effects" — the opponent's effects, all card kinds.
          immuneFrom: "opponentEffects",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digivolutionCardCount",
            nameOrTrait: [
              {
                tokens: ["Vemmon"],
                match: "nameExact",
              },
            ],
            op: "gte",
            value: 4,
          },
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Galacticmon"],
                match: "nameExact",
              },
            ],
          },
          from: ["hand", "trash"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    { reduceCost: 6, materials: [{ nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }], count: 8 }] },
  ],
};

registerIrCard("EX11-046", compiled);
