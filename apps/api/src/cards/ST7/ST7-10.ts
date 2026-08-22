// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
    },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST7-10", compiled);
