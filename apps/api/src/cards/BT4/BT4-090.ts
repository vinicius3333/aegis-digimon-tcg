import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "untilEndOfAttack",
        },
        {
          kind: "Attack",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          attackPlayer: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-090", compiled);
