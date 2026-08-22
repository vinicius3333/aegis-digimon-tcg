import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] },
    { trigger: "Main", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 13000 } }, count: 1 }, optional: true }, { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] }, count: 1 }, attackPlayer: true, optional: true }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-095", compiled);
