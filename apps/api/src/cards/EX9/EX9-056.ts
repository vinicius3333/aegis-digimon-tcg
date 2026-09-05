// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          optional: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
                dp: {
                  op: "lte",
                  value: 8000,
                },
              },
              count: 1,
            },
            raw: "By placing 1 8000 DP or lower Digimon as the bottom security card",
            destination: "security",
            position: "bottom",
            faceDown: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          optional: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
                dp: {
                  op: "lte",
                  value: 8000,
                },
              },
              count: 1,
            },
            raw: "By placing 1 8000 DP or lower Digimon as the bottom security card",
            destination: "security",
            position: "bottom",
            faceDown: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Ver.3"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          affectsAll: true,
          cost: {
            kind: "trashSecurityTop",
            raw: "by trashing your top security card, they don't leave",
          },
          raw: "[All Turns] [Once Per Turn] When any of your [Ver.3] trait Digimon would leave the battle area, by trashing your top security card, they don't leave.",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-056", compiled);
