import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-065 (Kaguyamon).
// [On Play]/[When Digivolving]/[When Attacking]: added playCostLte:5 to target filter
//   (text: "play cost 5 or lower [Puppet] or [Shambala] trait card").
// [All Turns] GainKeyword: trait filter uses [Puppet]/[TB] which matches the printed text
//   ("[Puppet] or [TB] trait Digimon") — not a bug, TB is the trait abbreviation.
// [On Deletion] superlative:lowestLevel is already correct.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Puppet", "Shambala"],
                  match: "trait",
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
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Puppet", "Shambala"],
                  match: "trait",
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
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Puppet", "Shambala"],
                  match: "trait",
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
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Puppet", "TB"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Puppet", "TB"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Puppet", "Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

export { compiled };
registerIrCard("EX12-065", compiled);
