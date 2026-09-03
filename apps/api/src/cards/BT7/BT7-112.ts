import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 2, raw: "＜Security Attack +2＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          raw: "Delete 1 of your opponent's Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // The first clause is an alternate digivolution from the hand onto a
  // Tamer treated as level 6, paid by placing exactly 10 Tamer/Hybrid cards
  // from hand and/or trash at the bottom of the deck in player-selected order.
  digivolutionRequirement: [
    {
      cost: 7,
      isAlternate: true,
      baseIsTamer: true,
      sourceZones: ["hand"],
      placementCost: {
        count: 10,
        from: ["hand", "trash"],
        kinds: ["Tamer"],
        traits: ["Hybrid"],
      },
    },
  ],
};

registerIrCard("BT7-112", compiled);
