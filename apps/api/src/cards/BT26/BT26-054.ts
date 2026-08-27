// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const csTamer = {
  filter: { controller: "mine", zone: "hand", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
  count: 1,
};
const csDigimon = {
  filter: { controller: "mine", zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
  count: 1,
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              ...csTamer.filter,
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              ...csTamer.filter,
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          requireByEffect: true,
          addedDigivolutionCardFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: csDigimon.filter,
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            { kind: "RedirectAttack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }],
};
registerIrCard("BT26-054", compiled);
export default compiled;
