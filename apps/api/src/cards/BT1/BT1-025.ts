// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
        duration: "forTheTurn",
      }],
    },
    {
      trigger: "YourTurn",
      actions: [{
        kind: "GrantStatic",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        grant: { kind: "PreventSecurityActivation", cardType: "Option" },
        duration: "forTheTurn",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-025", compiled);
