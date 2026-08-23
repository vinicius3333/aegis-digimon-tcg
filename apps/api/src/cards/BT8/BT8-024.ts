// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "[Your Turn] When this Digimon would digivolve, if you have 3 or fewer security
// cards, <Recovery +1 (Deck)>." — fires once during the digivolve declaration;
// the Replacement.actions run at that moment (KB Q1714: after declaring, before paying).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
          },
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
          },
          actions: [
            {
              kind: "GainKeyword",
              keyword: {
                keyword: "Recovery",
                amount: 1,
                source: "deck",
              },
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
              raw: "<Recovery +1 (Deck)>",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-024", compiled);
