// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST4-15", compiled);
