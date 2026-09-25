import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            totalPlayCostBudget: 14,
            upTo: true,
          },
          to: "deckBottom",
        },
        {
          kind: "PlayMultiple",
          totalCost: 12,
          filter: {
            controllerDefault: "mine",
            hostFilter: {
              isSelfRef: true,
            },
            nameOrTrait: [
              {
                tokens: ["DS"],
                match: "trait",
              },
            ],
          },
          from: ["digivolutionCards"],
          payCost: false,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              trait: ["DS"],
            },
            count: "all",
          },
          grant: "immuneToOpponentDigimonEffects",
          tokens: [],
          condition: {
            kind: "memoryAtLeast",
            value: 1,
            controller: "mine",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      condition: {
        kind: "memoryAtMost",
        value: 1,
        controller: "mine",
      },
      actions: [
        {
          kind: "DisableTimingEffect",
          whileMatchesTargetFilter: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          timings: ["onPlay"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Blue",
          level: 6,
        },
        {
          color: "Black",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Blue",
          level: 6,
        },
        {
          color: "Yellow",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Purple",
          level: 6,
        },
        {
          color: "Black",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          color: "Purple",
          level: 6,
        },
        {
          color: "Yellow",
          level: 6,
        },
      ],
    },
    {
      cost: 0,
      materials: [
        {
          namesExact: ["Plesiomon"],
        },
        {
          level: 5,
          names: ["Seadramon"],
        },
      ],
    },
  ],
};

registerIrCard("EX8-029", compiled);
