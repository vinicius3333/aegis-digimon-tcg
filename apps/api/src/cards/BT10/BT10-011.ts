// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { controller: "mine", kind: ["Tamer"] },
        actions: [
          { kind: "ModifyDP", target: self, amount: 2000, duration: "forTheTurn" },
          { kind: "GainKeyword", target: self, keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn", condition: { kind: "selfDpAtLeast", value: 12000 } },
        ],
      }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "GrantStatic",
        target: self,
        grant: "effects",
        filter: { zone: "digivolutionStack", nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
        duration: "permanent",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-011", compiled);
