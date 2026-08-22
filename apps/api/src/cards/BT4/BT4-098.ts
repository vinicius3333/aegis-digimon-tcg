// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1254-Q1255: the blocked trigger requires an actual Blocker block, and the
// security aura remains live for Digimon entering play afterward.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }, count: 1 },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
        },
        {
          kind: "SubTrigger",
          event: "whenBlocked",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
          actions: [{ kind: "GainMemory", amount: 3 }],
          condition: { kind: "isYourTurn" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{
        kind: "Aura",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" } },
        duration: "untilOwnerTurnEnd",
      }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-098", compiled);
