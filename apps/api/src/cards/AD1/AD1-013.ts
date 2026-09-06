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
          keyword: "Reboot",
          raw: "＜Reboot＞",
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
          kind: "Delete",
          target: {
            filter: {
              superlative: "lowestDigivolutionCards",
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
          kind: "Delete",
          target: {
            filter: {
              superlative: "lowestDigivolutionCards",
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
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayFromZone",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                  nameOrTrait: [
                    {
                      tokens: ["Blue Flare", "Xros Heart"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["Blue Flare", "Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Blue Flare", "Xros Heart"], match: "trait" }],
            },
          },
          scaling: {
            per: 1,
            filter: {},
            unit: "digivolutionCardColors",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Blue Flare", "Xros Heart"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("AD1-013", compiled);
