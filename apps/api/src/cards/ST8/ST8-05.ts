// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      condition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "hand",
        op: "gte",
        value: 8,
        raw: "you have 8 or more cards in your hand",
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levels: [3] },
            count: 1,
            bindAs: "returnTarget",
          },
        },
        {
          kind: "TrashDigivolution",
          target: { filter: {}, count: 1, fromSelectionRef: "returnTarget" },
          amount: 99,
          raw: "Trash all of the digivolution cards of that Digimon.",
        },
        { kind: "Return", target: { filter: {}, count: 1, fromSelectionRef: "returnTarget" }, to: "hand" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST8-05", compiled);
