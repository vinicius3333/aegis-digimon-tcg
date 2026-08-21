// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "AllTurns",
    actions: [{
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "modifyDP", amount: 1000 },
      while: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Twilight"], match: "trait" }] },
        raw: "this Digimon has [Twilight] in its traits",
      },
    }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-005", compiled);
