import type { Action, CompiledCard, Condition, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const didNotDelete: Condition = {
  kind: "ifThisEffectDidNotDelete",
  raw: "this effect didn't delete",
};

const deletionTarget: Target = {
  filter: {
    controller: "opponent",
    kind: ["Digimon"],
    dp: {
      op: "lte",
      value: 4000,
    },
  },
  count: 1,
};

const selfTarget: Target = {
  filter: {
    isSelfRef: true,
  },
  count: 1,
  isSelf: true,
};

const clause = (): Action[] => [
  {
    kind: "Delete",
    target: deletionTarget,
  },
  {
    kind: "GainKeyword",
    target: selfTarget,
    keyword: {
      keyword: "Raid",
      raw: "＜Raid＞",
    },
    duration: "forTheTurn",
    condition: didNotDelete,
  },
  {
    kind: "ModifyDP",
    target: selfTarget,
    amount: 3000,
    duration: "forTheTurn",
    condition: didNotDelete,
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: clause(),
    },
    {
      trigger: "WhenDigivolving",
      actions: clause(),
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-010", compiled);
