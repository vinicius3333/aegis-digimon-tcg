import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDNADigivolve",
          raw: "＜Blast DNA Digivolve ([WarGreymon] + [MetalGarurumon])＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
            bindAs: "dnaReturnLevel",
            upTo: true,
          },
          condition: { kind: "isDnaDigivolving" },
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] If DNA Digivolving, choose 1 opponent's Digimon and return the chosen Digimon and all of your opponent's Digimon with the same level to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "level", op: "eq", selectionRef: "dnaReturnLevel" },
            },
            count: "all",
          },
          to: "deckBottom",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
            bindAs: "dnaReturnLevel",
            upTo: true,
          },
          condition: { kind: "isDnaDigivolving" },
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] If DNA Digivolving, choose 1 opponent's Digimon and return the chosen Digimon and all of your opponent's Digimon with the same level to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "level", op: "eq", selectionRef: "dnaReturnLevel" },
            },
            count: "all",
          },
          to: "deckBottom",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          level: 6,
          names: ["Greymon"],
        },
        {
          level: 6,
          names: ["Garurumon"],
        },
      ],
    },
  ],
};

registerIrCard("BT17-078", compiled);
