// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Your Turn]: When digivolving one of your Digimon (in the BATTLE AREA only — per KB Q1038
// breeding-area digivolve doesn't activate this) into a Tyrannomon-named card in hand,
// you MAY suspend this Tamer to reduce the digivolution cost by 1.
// The effect is optional (you may suspend), so cost is opt-in.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
            },
            count: "all",
          },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 1,
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
            },
          },
          into: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
          },
          restriction: "suspendThisTamer",
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-088", compiled);
