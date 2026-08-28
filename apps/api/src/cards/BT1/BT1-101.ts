// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const trashAll = {
  kind: "TrashDigivolution",
  target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: "all" },
  amount: "all",
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [trashAll] },
    { trigger: "Security", actions: [trashAll] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-101", compiled);
export default compiled;
