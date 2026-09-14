import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ts: Filter = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const tsCard: Filter = {
  controller: "mine",
  kind: ["Digimon", "Tamer"],
  playCostLte: 4,
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
};
const namedTamer: Filter = {
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
            filter: {
              controllerDefault: "mine",
              zone: ["battleArea", "breeding"],
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] If you have a Tamer with [Dan Yuki] or [Kanan Yuki] in its name, all of your [TS] trait Digimon gain ＜Blocker＞ and +3000 DP until your opponent's turn ends.",
          kind: "GainKeyword",
          target: { filter: ts, count: "all" },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "youHave", filter: namedTamer },
        },
        {
          effectTextPart:
            "[Main] If you have a Tamer with [Dan Yuki] or [Kanan Yuki] in its name, all of your [TS] trait Digimon gain ＜Blocker＞ and +3000 DP until your opponent's turn ends.",
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
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: tsCard, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-101", compiled);
