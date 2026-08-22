// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      effectKey: "BT7-089/green-evo-cost-minus-1",
      actions: [{
        kind: "CostModifier",
        costType: "digivolve",
        mode: "reduce",
        amount: 1,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        into: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"] },
        duration: "forTheTurn",
      }],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      effectKey: "BT7-089/inherited-piercing",
      actions: [{
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "Piercing" },
        duration: "permanent",
      }],
    },
    {
      trigger: "Security",
      isSecurity: true,
      effectKey: "BT7-089/play-from-security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-089", compiled);
