// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownHand = { controllerDefault: "mine", zone: "hand" };
const optionFromTrash = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
};
const bottomFaceDownUnderTamer = {
  controller: "mine",
  zone: "digivolutionCards",
  faceDown: true,
  position: "bottom",
  hostFilter: { controller: "mine", kind: ["Tamer"] },
};

const drawAndTrash = [
  { kind: "Draw", controller: "mine", amount: 1 },
  { kind: "Trash", target: { filter: ownHand, count: 1 } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: drawAndTrash },
    { trigger: "WhenDigivolving", actions: drawAndTrash },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [{
        kind: "PlayWithoutCost",
        target: { filter: optionFromTrash, count: 1 },
        from: ["trash"],
        payCost: true,
        reduceCostBy: 2,
        optional: true,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 },
      }],
    },
    {
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
      actions: [],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-070", compiled);
