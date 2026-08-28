// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: Suspend 1 opponent Digimon AND 1 opponent Tamer; they can't unsuspend until end of their turn.
// KB Q2538: must suspend as many as possible (both if both exist).
// [Opponent's Turn][Once Per Turn]: when opponent's Digimon is played, you may suspend 1 of their Digimon.
// [Opponent's Turn][Once Per Turn]: when opponent's Digimon moves from breeding to battle, if [Rosemon]/[X Antibody]
//   is in this Digimon's digivolution cards, you may suspend 1 of their Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "digimonTarget",
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
            bindAs: "tamerTarget",
          },
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "digimonTarget" },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "tamerTarget" },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              optional: true,
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
          event: "whenOpponentMovedFromBreeding",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              optional: true,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Rosemon"],
                      match: "name",
                    },
                    {
                      tokens: ["X Antibody"],
                      match: "trait",
                    },
                  ],
                },
                raw: "if [Rosemon] or [X Antibody] is in this Digimon's digivolution cards",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-054", compiled);
export { compiled };
