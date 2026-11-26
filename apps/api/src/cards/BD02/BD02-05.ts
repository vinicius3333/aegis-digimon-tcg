import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 3,
          fromTop: false,
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "IceClad",
          raw: "Other than against Security Digimon, compare the number of digivolution cards instead of DP in this Digimon's battles.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD02-05", compiled);
