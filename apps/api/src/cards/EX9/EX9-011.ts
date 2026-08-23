// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the play cost by 2",
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Cyborg", "Ver.1"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                raw: "by trashing 1 [Cyborg] or [Ver.1] trait card from your hand",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            upTo: true,
            totalDpCap: 5000,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
          optional: true,
          abortOnDecline: true,
          totalDpCapScaling: {
            per: 1,
            filter: {
              faceDown: true,
            },
            unit: "selfFaceDownDigivolutionCards",
            amount: 2000,
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            upTo: true,
            totalDpCap: 5000,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
          optional: true,
          abortOnDecline: true,
          totalDpCapScaling: {
            per: 1,
            filter: {
              faceDown: true,
            },
            unit: "selfFaceDownDigivolutionCards",
            amount: 2000,
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};

registerIrCard("EX9-011", compiled);
