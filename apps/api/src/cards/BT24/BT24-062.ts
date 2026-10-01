import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Machine", "Cyborg", "TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [
                {
                  tokens: ["Machine", "Cyborg", "TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: { kind: "restriction", restriction: "attackTargetChange" },
          while: { kind: "true" },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [
    { reduceCost: 2, materials: [{ count: 1, namesExact: ["Blimpmon"] }] },
    { reduceCost: 2, materials: [{ count: 1, kinds: ["Tamer"], traits: ["TS"] }] },
  ],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Machine", "Cyborg", "TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-062", compiled);
