// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]:
//   If [Gesomon] or [X Antibody] is in this Digimon's digivolution cards, trash any 3 cards
//   under 1 of your opponent's Digimon or Tamers.
//   Then (regardless of above IF), 1 of your opponent's Digimon or Tamers without cards under it
//   can't suspend until the end of their turn.
// KB Q4708: the "then" part fires even if the "if" condition is not met.
// KB Q4709: "with cards under it" = has digivolution cards stacked under it.
// Inherited [When Attacking][Once Per Turn]: <Draw 1> and trash 1 card in hand.
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
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Gesomon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "trait",
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
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Gesomon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "trait",
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
