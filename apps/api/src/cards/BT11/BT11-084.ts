// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      ],
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

registerIrCard("BT11-084", compiled);
