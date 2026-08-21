// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
            raw: "＜Retaliation＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Megidramon", "ChaosGallantmon"],
                match: "name",
              },
            ],
          },
          from: ["hand"],
          optional: true,
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          raw: "reduce this effect's digivolution cost by 1",
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "both",
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Growlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-076", compiled);
