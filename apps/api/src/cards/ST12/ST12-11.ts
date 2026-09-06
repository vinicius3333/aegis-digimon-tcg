// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST12-11 Gankoomon
// [When Digivolving] You may play 1 Huckmon or 1 Digimon card with [Sistermon] in its name from your trash without paying its memory cost.
// [Your Turn][Once Per Turn] When you play another Digimon by an effect, ＜De-Digivolve 1＞ up to 2 of your opponent's Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Huckmon"], match: "nameExact" },
                { tokens: ["Sistermon"], match: "name" },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
            byEffect: true,
          },
          actions: [
            {
              kind: "DeDigivolve",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2, upTo: true },
              amount: 1,
            },
          ],
          raw: "When you play another Digimon by an effect, ＜De-Digivolve 1＞ up to 2 of your opponent's Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST12-11", compiled);
