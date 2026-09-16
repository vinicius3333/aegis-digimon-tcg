import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const options: Action[][] = [
  [{ kind: "GainMemory", amount: 1 }],
  [
    {
      kind: "ModifyDP",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      amount: 2000,
      duration: "forTheTurn",
    },
  ],
  [
    {
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 3, upTo: true },
    },
  ],
];

const labels = ["Gain 1 memory", "This Digimon gets +2000 DP for the turn", "Delete up to 3 level 3 Digimon"];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true },
          },
          options,
          labels,
        },
        {
          kind: "Modal",
          choose: 3,
          condition: {
            kind: "youHaveNone",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true },
          },
          options,
          labels,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-082", compiled);
