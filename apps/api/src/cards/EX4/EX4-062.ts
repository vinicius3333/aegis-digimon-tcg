// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Kiriha Aonuma", "Nene Amano"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "totalDigimonGte", count: 2, raw: "there are 2 or more total Digimon in play" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "DigiXrosMaterialZoneExpansion",
          zones: ["tamerCards", "trash"],
          duration: "permanent",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-062", compiled);
