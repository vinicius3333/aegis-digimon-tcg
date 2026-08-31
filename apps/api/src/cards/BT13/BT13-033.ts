// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { per: 4, filter: { zone: "hand", controller: "opponent" }, unit: "cards" },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 9,
            raw: "your opponent has 9 or more cards in their hand",
          },
          cost: {
            kind: "return",
            target: { filter: { zone: "hand", controller: "opponent" }, count: 1 },
            to: "deckBottom",
            leaveInZone: 8,
            selectionHidden: true,
            ownerInspectsSelection: true,
            orderReturnedCards: true,
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 0,
      isAlternate: true,
      namesExact: ["MirageGaogamon"],
      burstDigivolve: { returnTamerNamesExact: ["Thomas H. Norstein"] },
    },
  ],
};

registerIrCard("BT13-033", compiled);
