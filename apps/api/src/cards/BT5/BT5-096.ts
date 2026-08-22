// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const target = { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: "all" };
const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "Return", target, to: "hand" }, { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: "all" }, to: "hand", condition: { kind: "youHave", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Garurumon", "Omnimon"], match: "name" }] }, count: 1 } }] },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ], coverage: "full", residual: [],
};

registerIrCard("BT5-096", compiled);
