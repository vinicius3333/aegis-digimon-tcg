// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ts = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const namedTamer = {
  controller: "mine",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["Dan Yuki", "Kanan Yuki"], match: "name" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: ts, count: "all" },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "youHave", filter: namedTamer },
        },
        {
          kind: "ModifyDP",
          target: { filter: ts, count: "all" },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "youHave", filter: namedTamer },
        },
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              { kind: "SelectBind", target: { filter: ts, count: 1, bindAs: "tsDpReference" } },
              {
                kind: "Delete",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    dp: { op: "lte", valueFrom: "tsDpReference", valueField: "dp" },
                  },
                  count: 1,
                },
              },
            ],
            [{ kind: "Unsuspend", target: { filter: ts, count: 1 }, optional: true }],
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-101", compiled);
