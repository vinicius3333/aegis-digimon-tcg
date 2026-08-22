// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "OnDeletion", actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: {
    kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  } }], isInherited: true }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-006", compiled);
