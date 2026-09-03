import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "mine" },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-037", compiled);
export { compiled };
