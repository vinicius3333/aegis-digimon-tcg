import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT25-035 (Cougarmon).
// Fix: Digivolve cost filter changed from kind:["Tamer"] to zone:"underTamers"
// with faceDown:true — the text says "trash 2 bottom face-down cards from under
// any of your Tamers" (KB Q6300/Q6301: all 2 must come from underTamers,
// may be spread across multiple Tamers).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 2,
            raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 2,
            raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Glowing Dawn"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-035", compiled);
