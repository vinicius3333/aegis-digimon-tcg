// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Main",
      sharedUseKey: "delay-gain-2-memory",
      actions: [
        { kind: "Delete", target: { filter: { isSelfRef: true }, count: 1 } },
        { kind: "GainMemory", amount: 2 },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-102", compiled);
