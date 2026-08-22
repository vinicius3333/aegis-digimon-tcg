// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playYoshino = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "name" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  optional: true,
  condition: {
    kind: "permanentCount",
    seat: "mine",
    filter: { kind: ["Tamer"] },
    op: "lte",
    value: 1,
  },
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [playYoshino] },
    { trigger: "WhenDigivolving", actions: [playYoshino] },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-039", compiled);
