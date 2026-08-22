// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [{
        kind: "Delete",
        target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] }, count: 1 },
        cost: {
          kind: "deleteOwn",
          target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        },
        optional: true,
        abortOnDecline: true,
      }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-076", compiled);
