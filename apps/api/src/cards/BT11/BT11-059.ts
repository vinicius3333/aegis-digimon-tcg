// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        sourceFilter: { controller: "mine", kind: ["Digimon"] },
        actions: [{
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          scaling: {
          per: 1,
          filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Green", "Black"] },
          unit: "cards",
          },
        }],
      }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenDeletesInBattle",
        actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
      }],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-059", compiled);
