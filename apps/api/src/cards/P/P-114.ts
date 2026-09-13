import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-114 Diaboromon.
// [All Turns][Once Per Turn] When an effect plays another Digimon, you may delete 1 of
// your opponent's Digimon with play cost ≤ (3 + 2 × your Diaboromon count).
// The scalingCap on the Delete target encodes the dynamic maximum per-Diaboromon scaling.
// excludeSelf:true is correct — "another Digimon" means any Digimon except P-114 itself.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
            byEffect: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLte: 3,
                },
                count: 1,
              },
              playCostCeiling: {
                base: 3,
                raise: 2,
                per: 1,
                unit: "cards",
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Diaboromon"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "For each of your [Diaboromon], add 2 to this effect's play cost maximum.",
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-114", compiled);
