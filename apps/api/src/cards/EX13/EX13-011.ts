import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playMon: Action = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      nameOrTrait: [{ tokens: ["Mon"], match: "nameExact" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  optional: true,
  condition: {
    kind: "permanentCount",
    seat: "mine",
    filter: { kind: ["Tamer"] },
    op: "lte",
    value: 1,
  },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Raid", raw: "＜Raid＞" }],
    },
    { trigger: "OnPlay", actions: [playMon] },
    { trigger: "WhenDigivolving", actions: [playMon] },
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
  digivolutionRequirement: [{ level: 3, texts: ["Huckmon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-011", compiled);
