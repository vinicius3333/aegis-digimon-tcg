// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handCardCost = {
  kind: "place",
  target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 },
  destination: "digivolutionStack",
  position: "bottom",
  host: "self",
  faceDown: true,
};

const returnLevelFour = {
  kind: "Return",
  target: {
    filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
    count: 1,
  },
  to: "deckBottom",
  cost: handCardCost,
  optional: true,
};

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Training", raw: "＜Training＞" },
        { keyword: "Jamming", raw: "＜Jamming＞" },
      ],
    },
    { trigger: "OnPlay", actions: [returnLevelFour] },
    { trigger: "WhenAttacking", actions: [returnLevelFour] },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-023", compiled);
