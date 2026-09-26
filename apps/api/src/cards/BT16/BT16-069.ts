import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          choose: true,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Gesomon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "if [Gesomon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          choose: true,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Gesomon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "if [Gesomon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gesomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-069", compiled);
export { compiled };
