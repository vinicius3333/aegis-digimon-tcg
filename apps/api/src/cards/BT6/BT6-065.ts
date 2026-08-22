// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "RevealAdd", revealCount: 5, add: [], rest: "deckBottom" },
        { kind: "PlayWithoutCost", target: { filter: { kind: ["Option"], memoryCost: 7 }, count: 1, location: "revealed" }, from: ["revealed"], payCost: false, costReduction: 0, optional: true },
        { kind: "Trash", target: { filter: { controllerDefault: "mine" }, count: 1 } },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 }, condition: { kind: "raw", raw: "you don't use an Option card with this effect" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-065", compiled);
