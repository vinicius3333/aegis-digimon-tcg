import type { Action } from "@aegis/shared/effects/ir/actions/action";
import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

const suspendThenBottom: Action[] = [
  {
    effectTextPart: "[When Digivolving][On Deletion] Suspend 1 of your opponent's Digimon.",
    kind: "Suspend",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  },
  {
    effectTextPart:
      "Then, return 1 of your opponent's suspended Digimon with 5000 DP or less to the bottom of the deck.",
    kind: "Return",
    target: {
      filter: { controller: "opponent", suspended: true, kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
      count: 1,
    },
    to: "deckBottom",
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: suspendThenBottom },
    { trigger: "OnDeletion", actions: suspendThenBottom },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" },
            count: "all",
          },
          effect: { kind: "restriction", restriction: "attackOnlySuspendedDigimon" },
          while: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-06", compiled);
