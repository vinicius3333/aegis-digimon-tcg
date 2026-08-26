// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const reveal: any = {
  kind: "RevealAdd",
  revealCount: 5,
  add: [
    {
      filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Analogman"], match: "name" }] },
      count: 1,
      to: "hand",
    },
    {
      filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }] },
      count: 1,
      to: "hand",
      optional: true,
      orDispositions: [{ to: "placeUnder", underFilter: { isSelfRef: true } }],
    },
  ],
  rest: "trash",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [reveal] },
    { trigger: "OnPlay", actions: [reveal] },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            filter: { zone: "battleArea", controller: "mine", nameOrTrait: [{ tokens: ["Analogman"], match: "name" }] },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Machinedramon"], match: "name" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-072", compiled);
