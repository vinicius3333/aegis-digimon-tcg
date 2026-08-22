import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Insect"], match: "trait" }] }, count: 1, bindAs: "selected" } },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"], relativeTo: { selectionRef: "selected", attr: "dp", op: "lte" } }, count: 2 } },
        { kind: "Restrict", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
      ],
    },
    { trigger: "Security", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 } }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-102", compiled);
