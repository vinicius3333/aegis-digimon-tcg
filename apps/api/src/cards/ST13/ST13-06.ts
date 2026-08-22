// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blitz", raw: "＜Blitz＞" },
          duration: "forTheTurn",
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 20 },
            count: 1,
          },
          scaling: { per: 4, unit: "digivolutionCards" },
          condition: { kind: "isDnaDigivolving", raw: "When DNA digivolving" },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: { per: 4, unit: "digivolutionCards" },
          condition: { kind: "isDnaDigivolving", raw: "When DNA digivolving" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
          raw: "when a card is removed from a player's security stack",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 6 },
        { color: "Black", level: 6 },
      ],
    },
  ],
};
registerIrCard("ST13-06", compiled);
