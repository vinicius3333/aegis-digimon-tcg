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
