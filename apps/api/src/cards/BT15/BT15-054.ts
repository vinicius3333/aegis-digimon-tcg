import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              unsuspended: true,
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
              unsuspended: true,
            },
            count: 1,
            bindAs: "tamerTarget",
          },
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "digimonTarget", filter: {}, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "tamerTarget", filter: {}, count: 1 },
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
