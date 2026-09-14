import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] 1 of your Digimon gets +2000 DP for the turn.",
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 2000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if the number of cards in your security stack is less than or equal to your opponent's, 1 of your Digimon gains ＜Security Attack +1＞ for the turn. (This Digimon checks 1 additional security card.)",
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
          condition: { kind: "not", condition: { kind: "securityCompare", op: "gt" } },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST7-11", compiled);
