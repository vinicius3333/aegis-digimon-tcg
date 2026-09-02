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
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
            count: 1,
            bindAs: "atomicInfernoTarget",
          },
        },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "atomicInfernoTarget" },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "atomicInfernoTarget" },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
        },
        {
          kind: "SubTrigger",
          event: "whenBlocked",
          on: { filter: {}, count: 1, fromSelectionRef: "atomicInfernoTarget" },
          actions: [{ kind: "GainMemory", amount: 3 }],
          condition: { kind: "isYourTurn" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "untilYourTurnEnd",
        },
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          playerScoped: true,
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          duration: "untilYourTurnEnd",
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isTriggerSource: true }, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
              duration: "untilYourTurnEnd",
            },
          ],
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-098", compiled);
