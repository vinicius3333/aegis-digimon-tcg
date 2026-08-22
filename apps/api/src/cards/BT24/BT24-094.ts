// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tsColor = {
  controller: "mine",
  kind: ["Digimon"],
  colors: ["Green", "Yellow"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true, controllerDefault: "mine" } } }],
    },
    {
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        { kind: "ModifyDP", target: { filter: tsColor, count: "all" }, amount: 2000, duration: "permanent" },
        { kind: "Aura", target: { filter: tsColor, count: "all" }, effect: { kind: "keyword", keyword: { keyword: "Alliance", raw: "＜Alliance＞" } }, while: { kind: "youHave", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Merukimon", "Minervamon"], match: "name" }] } } },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
        { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", source: { filter: { isSelfRef: true }, count: 1, isSelf: true }, toTop: false, faceUp: true },
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", zone: "hand", kind: ["Digimon"], colors: ["Green", "Yellow"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }, count: 1 }, from: ["hand"], payCost: true, reduceCostBy: 3, optional: true },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Green", "Yellow"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-094", compiled);
