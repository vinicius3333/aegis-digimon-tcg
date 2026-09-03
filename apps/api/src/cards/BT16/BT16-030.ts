import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Start of Your Main Phase] [On Play]: fires at both timings independently (correct per TCG rules).
// KB Q2626: digivolution requirements must be met (no ignoreReqs).
// Two separate effects for the two timings is the established convention (cf. EX6-063).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [
              {
                tokens: ["Holy Beast", "Free"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levels: [4],
            nameOrTrait: [
              {
                tokens: ["Holy Beast", "Free"],
                match: "trait",
              },
            ],
          },
          from: ["trash"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -3000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Nyaromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-030", compiled);
export { compiled };
