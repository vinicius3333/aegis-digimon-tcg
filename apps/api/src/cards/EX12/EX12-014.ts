import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR. Decode is represented both by its visible keyword and by an executable
// would-leave replacement in each printed placement.
//
// CR 16-36-1 scopes Decode to "THAT Digimon's digivolution cards", so the replacement's
// PlayWithoutCost carries `hostFilter: { isSelfRef: true }`; without it the
// `from: ["digivolutionCards"]` pool spans every stack the controller owns.
//
// CR 15-6-2: separate processes in one effect do not inherit each other's conditions, and the
// printed text does not say "if you did", so the optional PlaceUnder must NOT abort the
// following "Then, 1 of your Digimon may attack" when declined or unavailable.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Gammamon"], match: "text" },
                    { tokens: ["VB"], match: "trait" },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          optional: true,
          position: "bottom",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
                {
                  tokens: ["VB"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          optional: true,
          position: "bottom",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Gammamon"], match: "text" },
                    { tokens: ["VB"], match: "trait" },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Gammamon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["VB"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};
registerIrCard("EX12-014", compiled);
