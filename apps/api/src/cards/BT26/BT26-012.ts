// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tbHand = { controllerDefault: "mine", zone: "hand", nameOrTrait: [{ tokens: ["TB"], match: "trait" }] };
const tbDigimon = { ...tbHand, kind: ["Digimon"] };
const tbOption = { ...tbHand, kind: ["Option"] };

export const compiled: CompiledCard = {
  effects: [{
    trigger: "Main",
    frequency: "OncePerTurn",
    actions: [{
      kind: "Modal",
      choose: 1,
      options: [[{
        kind: "PlayWithoutCost", target: { filter: tbDigimon, count: 1 }, from: ["hand"],
        payCost: true, reduceCostBy: 2, optional: true,
      }], [{
        kind: "UseOptionWithoutCost", filter: tbOption, from: ["hand"],
        payCost: true, reduceCostBy: 2, optional: true,
      }]],
    }],
  }, {
    trigger: "OnAllyAttack",
    isInherited: true,
    frequency: "OncePerTurn",
    actions: [{ kind: "ModifyDP", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -2000, duration: "untilEachTurnEnd" }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-012", compiled);
