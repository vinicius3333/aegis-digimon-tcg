// Hand-authored override for BT25-049 (Armalizamon).
// runtime-effect fix:
// - YourTurn Replacement: sourceFilter adds kind:["Option"] + Glowing Dawn trait restriction.
// - cost target: digivolution cards (face-down cards) under a Tamer (zone:"digivolutionCards" +
//   hostFilter kind:["Tamer"]), not the Tamer itself.
// - Replacement mode: reduceCost amount:3 (was missing).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          actions: [],
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card under any of your Tamers",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
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

registerIrCard("BT25-049", compiled);
