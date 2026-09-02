import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-028 Gusokumon.
// The printed DNA requirement has four legal color combinations:
// (Blue or Purple) Lv.4 + (Black or Yellow) Lv.4.
//
// CR 16-36-1 scopes Decode to "THAT Digimon's digivolution cards", so the replacement's
// PlayWithoutCost carries `hostFilter: { isSelfRef: true }`; without it the
// `from: ["digivolutionCards"]` pool spans every stack the controller owns.
export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 4, traits: ["DS"], cost: 3, isAlternate: true }],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 4 },
        { color: "Yellow", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Purple", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Purple", level: 4 },
        { color: "Yellow", level: 4 },
      ],
    },
  ],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[DS] trait)＞" }],
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
                  nameOrTrait: [{ tokens: ["DS"], match: "trait" }],
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { kind: ["Digimon"] },
          actions: [
            {
              kind: "DeDigivolve",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: 1,
              cost: {
                kind: "place",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["DS"], match: "trait" }],
                  },
                  count: 1,
                  from: ["hand"],
                },
                raw: "by placing 1 [DS] trait Digimon card from your hand as this Digimon's bottom digivolution card",
                destination: "digivolutionStack",
                position: "bottom",
                host: "self",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "memoryAtMost", value: 0, raw: "if you have 0 or less memory" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["DS"], match: "trait" }],
                },
                count: 1,
              },
              optional: true,
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
};

registerIrCard("EX12-028", compiled);
