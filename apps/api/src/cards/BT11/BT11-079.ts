// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
    {
      trigger: "OnDeletion",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-079", compiled);
