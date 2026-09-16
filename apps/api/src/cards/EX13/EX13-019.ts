import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playVeedramonTamer: Action = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      zone: "hand",
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: true,
  reduceCostBy: 2,
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [playVeedramonTamer],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }],
};

registerIrCard("EX13-019", compiled);
