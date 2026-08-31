// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const nsp = {
  controller: "mine",
  kind: ["Digimon"],
  playCostLte: 7,
  nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
};
const reduction = {
  kind: "ModifyDP",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: -7000,
  duration: "forTheTurn",
  scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" },
          ifTrue: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { ...nsp, differentColors: true }, count: 2 },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
          ifFalse: [
            {
              kind: "PlayWithoutCost",
              target: { filter: nsp, count: 1 },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "If DNA digivolving, play 2 with different colors instead",
        },
      ],
    },
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [reduction] },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [reduction] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-037", compiled);
