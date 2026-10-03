import type { CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }] },
    ...(["OnPlay", "WhenDigivolving"] as const).map<CardEffect>((trigger) => ({
      trigger,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 },
        },
      ],
    })),
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] [Once Per Turn] If your opponent has 5 or more memory, their Digimon effects don't affect this Digimon until their turn ends.",
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "beAffected",
          duration: "untilOpponentTurnEnd",
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
          condition: { kind: "memoryAtLeast", value: 5, controller: "opponent" },
        },
        {
          effectTextPart:
            "Then, if they have 5 or less, their Option effects don't affect this Digimon until their turn ends.",
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "beAffected",
          duration: "untilOpponentTurnEnd",
          fromSourceKind: ["Option"],
          byOpponentEffectsOnly: true,
          condition: { kind: "memoryAtMost", value: 5, controller: "opponent" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS", "Dinosaur"], cost: 4, isAlternate: true }],
};

registerIrCard("BT25-019", compiled);
