import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ver3: Filter = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon"],
  playCostLte: 6,
  nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }],
};
const playVer3: Action = {
  kind: "PlayWithoutCost",
  target: { filter: ver3, count: 1 },
  from: ["trash"],
  payCost: false,
  optional: true,
  playCostCeiling: { base: 6, raise: 1, per: 1, filter: {}, unit: "selfFaceDownDigivolutionCards" },
};
const shared = { frequency: "OncePerTurn", sharedUseKey: "bt26-077-play-ver3", actions: [playVer3] } satisfies Pick<
  CardEffect,
  "frequency" | "sharedUseKey" | "actions"
>;

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    { keyword: "Execute", raw: "＜Execute＞" },
    { keyword: "Fragment", amount: 2, raw: "＜Fragment (2)＞" },
  ],
  effects: [
    { trigger: "OnPlay", ...shared },
    { trigger: "WhenDigivolving", ...shared },
    { trigger: "WhenAttacking", ...shared },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"], superlative: "highestPlayCost" },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-077", compiled);
export default compiled;
