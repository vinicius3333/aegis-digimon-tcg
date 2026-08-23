// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5044/Q5045: Save is matched in card text; the hand trash is a mandatory
// shared cost for Draw 1 and suspending an opposing Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand", textContains: "Save" }, count: 1 },
            raw: "By trashing 1 card with ＜Save＞ in its text from your hand",
          },
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "ifThisEffectActed", raw: "if you did" },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 2, colors: ["Green"], cost: 1 },
    { level: 2, colors: ["Purple"], cost: 1 },
  ],
  digiXrosRequirement: [
    {
      materials: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Save"], match: "text" }] }],
      count: 1,
      costReduction: 2,
    },
  ],
};

registerIrCard("EX10-015", compiled);
export default compiled;
