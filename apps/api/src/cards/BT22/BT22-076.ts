import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
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
      optional: true,
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
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      optional: true,
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
    { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
    { level: 5, colors: ["Yellow"], cost: 5, isAlternate: false },
    {
      level: 5,
      traits: ["DM"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-076", compiled);
