// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST23-11 Wolvermon
// [Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2
// <Blocker>
// [Your Turn] When this Digimon would digivolve into a [Glowing Dawn] trait Digimon card, by
//   trashing the bottom face-down card from under any of your Tamers, reduce the cost by 2.
// (inherited) <Blocker>
//
// Fix: cost was "kind: trash" targeting a Tamer card directly. Should be
// "kind: trashBottomFaceDownUnderTamer" — trash the face-down digivolution card under a Tamer,
// per the BT25-027 pattern.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
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
          mode: "reduceCost",
          amount: 2,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          actions: [],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
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

registerIrCard("ST23-11", compiled);
