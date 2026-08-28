// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-062 — Kiriha Aonuma & Nene Amano.
const compiled: CompiledCard = {
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
      optional: true,
      actions: [
        {
          kind: "DigiXrosMaterialZoneExpansion",
          zones: ["underTamers", "trash"],
          duration: "permanent",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
          raw: "by suspending this Tamer, 1 card under your Tamers and 1 card in your trash can also be placed for DigiXros",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-062", compiled);
