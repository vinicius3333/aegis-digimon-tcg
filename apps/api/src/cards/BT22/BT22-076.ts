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
          // This reduction belongs to ShinMonzaemon while it is the card in hand
          // being digivolved into. A field-resident Replacement cannot see the
          // destination card and therefore never reduces the printed cost.
          kind: "CostModifier",
          costType: "digivolve",
          mode: "delta",
          amount: -2,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.1"],
                match: "trait",
              },
            ],
          },
          into: { cardId: "BT22-076" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          toTop: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
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
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          toTop: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["DM"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-076", compiled);
