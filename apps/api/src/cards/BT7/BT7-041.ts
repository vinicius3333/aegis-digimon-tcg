// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 3 },
        },
        {
          kind: "Recover",
          amount: 3,
          scaling: { per: 1, bonus: -1, unit: "security", filter: { controller: "mine" } },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 3 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-041", compiled);
