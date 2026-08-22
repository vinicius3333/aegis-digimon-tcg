// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-059 — Cherubimon.
const replayOnDeletion = {
  kind: "PlayWithoutCost",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  from: ["trash"],
  payCost: false,
  optional: true,
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          gainedTrigger: "OnDeletion",
          gainedActions: [replayOnDeletion],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainTriggeredEffect",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true, levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
          gainedTrigger: "OnDeletion",
          gainedActions: [replayOnDeletion],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-059", compiled);
