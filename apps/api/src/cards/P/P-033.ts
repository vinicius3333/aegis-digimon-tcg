// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4145-Q4147: both keyword grants track current DP continuously, including during
// attack resolution; crossing below 13000 immediately removes additional checks.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              dp: { op: "gte", value: 13000 },
            },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
              kind: ["Digimon"],
              colors: ["Black"],
              dp: { op: "gte", value: 13000 },
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-033", compiled);
