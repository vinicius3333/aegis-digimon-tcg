import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
