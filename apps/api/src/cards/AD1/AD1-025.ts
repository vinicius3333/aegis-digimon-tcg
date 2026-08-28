// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition ([WarGreymon] & [MetalGarurumon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          to: "deckBottom",
        },
        {
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
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          to: "deckBottom",
        },
        {
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLeavesPlay",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Trash",
              target: {
                filter: {
                  zone: "battleArea",
                  controller: "opponent",
                  kind: ["Option"],
                },
                count: 1,
              },
            },
            {
              kind: "Trash",
              target: {
                filter: {
                  zone: "security",
                  controller: "opponent",
                  position: "top",
                },
                count: 1,
              },
            },
          ],
          oncePerTurnKey: "opponent-leaves",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("AD1-025", compiled);
