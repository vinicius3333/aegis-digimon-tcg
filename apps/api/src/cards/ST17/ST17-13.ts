// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Armor Purge", raw: "＜Armor Purge＞" },
    ] },
    { trigger: "Security", actions: [
      { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 1 },
      { kind: "SubTrigger", event: "whenSecurityBattleEnded", once: true, actions: [
        { kind: "Digivolve", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Magnamon"], match: "name" }] }, from: ["security"], payCost: false, optional: true },
      ] },
    ], isSecurity: true },
    { trigger: "WhenDigivolving", actions: [
      { kind: "TrashDigivolution", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 1 },
      { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 }, to: "hand" },
    ] },
  ],
  coverage: "partial",
  residual: ["When Digivolving trash count must scale with the selected Digimon's colors; IR currently accepts only a fixed TrashDigivolution amount."],
  digivolutionRequirement: [{ names: ["Veemon"], cost: 3, isAlternate: true }],
};

registerIrCard("ST17-13", compiled);
