import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-080 (Raguelmon).
// [On Play] Play 1 purple or yellow Digimon card with 6000 DP or less from your trash.
// If you have 1 or fewer security cards, you may play 1 level 6 or lower Digimon card
// with [Angel] or [Fallen Angel] in its traits from your trash instead.
// KB Q1873: the "instead" choice is available when security ≤ 1.
// KB Q1874: the alternative play is also from your trash.
//
// [End of Your Turn] You may DNA digivolve this Digimon and one of your other Digimon
// in play into a Digimon card in your hand for its DNA digivolve cost.
// Encoded: materials.isSelf = true triggers the self+1-other pickup in runDnaDigivolve.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              dp: { op: "lte", value: 6000 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 2 },
        },
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Yellow", "Purple"],
                    dp: { op: "lte", value: 6000 },
                  },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 6 },
                    nameOrTrait: [{ tokens: ["Angel", "Fallen Angel"], match: "trait" }],
                  },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
              },
            ],
          ],
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 1 },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: { isSelfRef: true },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasDnaDigivolutionRequirement: true,
              zone: "hand",
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-080", compiled);
