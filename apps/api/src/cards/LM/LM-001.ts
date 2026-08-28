// @ts-nocheck
// HAND-FIXED IR for LM-001 — do not regenerate.
// [Hand][Counter] parenthetical "(Your Digimon may digivolve into this card without
// paying the cost)" = BlastDigivolve keyword mechanic (same as ＜Blast Digivolve＞).
// Audit fixes (LM audit): the "for each color in this Digimon's digivolution cards" ceiling
// is raised BEFORE the delete resolves and is scoped to this permanent, and it counts the
// SOURCE stack's distinct colors (`digivolutionCardColors`) — `unit: "colors"` over a
// `zone: "digivolutionCards"` filter reads battle-area permanents, never the stack.
// The placement destination is this Digimon itself ("as this Digimon's bottom digivolution card").
// "When ANOTHER Digimon is deleted" is side-agnostic, so the watcher's source filter defaults to
// either controller rather than only this Digimon's own side.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Hand",
      actions: [],
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "Counter",
      actions: [],
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          optional: true,
        },
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "dpDeletion",
          amount: 1000,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          scaling: {
            per: 1,
            unit: "digivolutionCardColors",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 8000,
              },
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
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Gammamon"],
                  match: "text",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          optional: true,
        },
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "dpDeletion",
          amount: 1000,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          scaling: {
            per: 1,
            unit: "digivolutionCardColors",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 8000,
              },
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
          event: "onDeletionOf",
          sourceFilter: {
            controllerDefault: "any",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-001", compiled);
