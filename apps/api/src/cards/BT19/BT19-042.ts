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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Dynasmon"], match: "name" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
            raw: "[Dynasmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 6000,
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Dynasmon"], match: "name" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
            raw: "[Dynasmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 6000,
          duration: "untilOpponentTurnEnd",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          toTop: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 2,
            raw: "you have 2 or fewer security cards",
          },
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Dynasmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-042", compiled);
