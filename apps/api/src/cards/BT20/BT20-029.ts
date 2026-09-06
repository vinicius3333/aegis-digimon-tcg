import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q4322/Q4323 and the official card list include Pulsemon anywhere in card text.
// The older community catalog transcription incorrectly limited this to names.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Pulsemon"], match: "text" },
              { tokens: ["SEEKERS"], match: "trait" },
            ],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    },
    {
      trigger: "WhenBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Bibimon"], cost: 0, isAlternate: true },
    { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
  ],
};

registerIrCard("BT20-029", compiled);
