// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          amountFromPaidCost: true,
          optional: false,
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Shaman", "Wizard"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 3,
              optional: false,
              cost: {
                kind: "trash",
                target: {
                  filter: { zone: "security", controller: "mine" },
                  count: 3,
                  upTo: true,
                },
                raw: "trash up to 3 of your security cards",
              },
            },
          ],
          raw: "reduce the digivolution cost by 1 for each security card trashed",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 3 },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-074", compiled);
