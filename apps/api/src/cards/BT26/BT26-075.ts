// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const glowingDawn = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon", "Tamer"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
};
const playGlowingDawn = {
  kind: "PlayWithoutCost",
  from: ["trash"],
  payCost: false,
  optional: true,
  target: { filter: glowingDawn, count: 1 },
  cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        { kind: "GainKeyword", target: self, keyword: { keyword: "Execute" }, duration: "permanent" },
        { kind: "GainKeyword", target: self, keyword: { keyword: "Ascension" }, duration: "permanent" },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [playGlowingDawn] },
    { trigger: "OnDeletion", actions: [playGlowingDawn] },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-075", compiled);
export default compiled;
