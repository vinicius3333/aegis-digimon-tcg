// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: "name",
        tokens: ["Numemon"],
      }],
    },
    {
      trigger: "OnPlay",
      actions: [{
        kind: "Draw",
        controller: "mine",
        amount: 2,
        cost: {
          kind: "trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                { tokens: ["Numemon", "Sukamon", "Nanimon"], match: "name" },
                { tokens: ["Etemon"], match: "name" },
              ],
            },
            count: 1,
          },
        },
        optional: true,
        abortOnDecline: true,
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-063", compiled);
