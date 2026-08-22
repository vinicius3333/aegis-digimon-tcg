// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashChronomonOrShaman = {
  kind: "trash",
  target: {
    filter: {
      zone: "hand",
      controller: "mine",
      nameOrTrait: [
        { tokens: ["Chronomon"], match: "text" },
        { tokens: ["Shaman"], match: "trait" },
      ],
    },
    count: 1,
  },
};

const drawTwoWithCost = {
  kind: "Draw",
  controller: "mine",
  amount: 2,
  cost: trashChronomonOrShaman,
  optional: false,
  abortOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "OnPlay", actions: [drawTwoWithCost] },
    { trigger: "WhenDigivolving", actions: [drawTwoWithCost] },
    { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-011", compiled);
