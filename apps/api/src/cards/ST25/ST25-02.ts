import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const boostOneDigimon: Action = {
  kind: "ModifyDP",
  effectTextPart: "1 of your Digimon gets +3000 DP for the turn.",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
  amount: 3000,
  duration: "forTheTurn",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenMoving", actions: [boostOneDigimon] },
    { trigger: "OnPlay", actions: [boostOneDigimon] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, texts: ["Gemmon"], cost: 0, isAlternate: true }],
};

registerIrCard("ST25-02", compiled);
