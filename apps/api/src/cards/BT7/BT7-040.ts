import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          costType: "digivolve",
          mode: "set",
          amount: 0,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          scaling: { per: 1, unit: "security", floor: 1, filter: { controller: "mine" } },
        },
      ],
    },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { isSelfRef: true }, count: 4, upTo: true, isSelf: true },
          amount: 4,
          choose: true,
          trackCount: "rasenmonDigiBurst",
          raw: "＜Digi-Burst up to 4＞",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
          scaling: { per: 1, unit: "namedCount", countSource: "rasenmonDigiBurst" },
          condition: { kind: "namedCountAtLeast", countSource: "rasenmonDigiBurst", count: 1 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-040", compiled);
