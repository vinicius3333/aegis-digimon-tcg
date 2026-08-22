// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4130: an exact [Mimi Tachikawa] in play enables the free [Palmon] play.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      condition: {
        kind: "youHave",
        filter: {
          zone: "battleArea",
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Mimi Tachikawa"], match: "nameExact" }],
        },
        raw: "you have [Mimi Tachikawa] in play",
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Palmon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          bindResultAs: "playedPalmon",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Mimi Tachikawa"], match: "nameExact" }],
            },
            count: 1,
          },
          to: "hand",
          condition: { kind: "bindingExists", ref: "playedPalmon" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "AddToHandSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-021", compiled);
