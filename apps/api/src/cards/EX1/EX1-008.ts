// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 }, attackPlayer: true }],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
        duration: "permanent",
        condition: { kind: "or", conditions: [{ kind: "sourceHasTrait", trait: "Machine" }, { kind: "sourceHasTrait", trait: "Dragonkin" }] },
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-008", compiled);
