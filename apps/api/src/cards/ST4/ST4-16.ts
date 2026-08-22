// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "Return", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 }, to: "hand" },
        { kind: "Trash", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: "all" } },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST4-16", compiled);
