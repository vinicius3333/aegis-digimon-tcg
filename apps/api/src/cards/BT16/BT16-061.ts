// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Collision", raw: "<Collision>" }] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Beast Dragon", "Undead", "SoC"], match: "trait" }],
              },
              from: ["hand"],
              payCost: false,
              ignoreRequirements: false,
              optional: true,
              condition: {
                kind: "selfDigivolutionStackMatchesFilter",
                filter: {
                  kind: ["Tamer"],
                  nameOrTrait: [{ tokens: ["SoC"], match: "trait" }],
                },
              },
            },
          ],
          raw: "when an attack target is switched",
        },
      ],
    },
    {
      trigger: "WhenBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [{ tokens: ["X Antibody", "SoC"], match: "trait" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, names: ["Dorugamon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["SoC"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT16-061", compiled);
