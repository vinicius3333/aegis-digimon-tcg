// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendAndReward = [
  {
    kind: "Suspend",
    target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
  },
  {
    kind: "GainMemory",
    amount: 1,
    condition: {
      kind: "opponentHasNone",
      filter: { controllerDefault: "opponent", kind: ["Digimon"], unsuspended: true },
      raw: "your opponent has no unsuspended Digimon",
    },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "WhenDigivolving", actions: suspendAndReward },
    { trigger: "WhenAttacking", actions: suspendAndReward },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              unsuspended: true,
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            count: 1,
          },
          attackPlayer: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-025", compiled);
