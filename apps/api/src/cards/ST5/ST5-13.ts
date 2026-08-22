// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }] },
    {
      trigger: "Main",
      keywords: [{ keyword: "DigiBurst", amount: 2, raw: "＜Digi-Burst 2＞" }],
      actions: [{
        kind: "ModifyDP",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        amount: 4000,
        duration: "untilOpponentTurnEnd",
        cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 }, raw: "＜Digi-Burst 2＞" },
        abortOnDecline: true,
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-13", compiled);
