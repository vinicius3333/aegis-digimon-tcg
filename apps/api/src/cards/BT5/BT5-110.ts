// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Explicit source trash must run before Return while the bound permanent still exists;
// automatic attachment cleanup during Return does not publish a source-trash effect event.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Omnimon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            bindAs: "omnimonSelected",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "TrashDigivolution",
          target: {
            fromSelectionRef: "omnimonSelected",
            filter: {},
            count: 1,
          },
          amount: 99,
          raw: "Trash all of the digivolution cards of the Digimon you returned with this effect.",
        },
        {
          kind: "Return",
          target: {
            fromSelectionRef: "omnimonSelected",
            filter: {},
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-110", compiled);
