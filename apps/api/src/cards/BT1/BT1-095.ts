// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const main = [
  { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
  {
    kind: "GainKeyword",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
    keyword: { keyword: "Blocker" },
    duration: "untilOpponentTurnEnd",
  },
];
const security = [
  { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
  {
    kind: "GainKeyword",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
    keyword: { keyword: "Blocker" },
    duration: "forTheTurn",
  },
];
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: main },
    { trigger: "Security", actions: security },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-095", compiled);
export default compiled;
