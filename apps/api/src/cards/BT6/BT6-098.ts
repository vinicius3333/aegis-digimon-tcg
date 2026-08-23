// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "Return to hand" is the default; "return to deckBottom instead" overrides it
// when opponent has 3+ Digimon. The 'instead' conditional-destination cannot be
// expressed with a single Return action (ReturnAction.to is fixed). The two-Return
// encoding selects the Digimon once for the conditioned branch and the constraint
// that both branches are mutually exclusive requires CAP-E-6 (conditional-instead
// Return). The Trash of digivolution cards only applies to the deckBottom branch.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "not",
            condition: {
              kind: "opponentHas",
              filter: { zone: "battleArea", controllerDefault: "opponent", kind: ["Digimon"] },
              count: 3,
            },
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          replaces: "previous",
          condition: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 3,
            raw: "if your opponent has 3 or more Digimon in play",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-098", compiled);
