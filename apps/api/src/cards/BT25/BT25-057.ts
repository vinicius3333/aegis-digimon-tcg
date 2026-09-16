import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: ["battleArea", "breeding"],
              nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
            },
            raw: "you have a card w/[Glowing Dawn] trait",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom face-down card under any of your Tamers, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "By trashing the bottom face-down card under any of your Tamers",
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
      description:
        "[When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom face-down card under any of your Tamers, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "By trashing the bottom face-down card under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Battle",
          attacker: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
      description: "[When Digivolving] This Digimon may battle 1 of your opponent's Digimon.",
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { controllerDefault: "mine", kind: ["Digimon"] },
            count: 1,
          },
          amount: 5000,
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { controllerDefault: "mine", kind: ["Digimon"] },
            count: 1,
            sameTarget: true,
          },
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { controllerDefault: "mine", kind: ["Digimon"] },
            count: 1,
            sameTarget: true,
          },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            filter: { controllerDefault: "mine", kind: ["Digimon"] },
            count: 1,
            sameTarget: true,
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      colors: ["Green"],
      cost: 4,
      isAlternate: false,
    },
    {
      level: 4,
      colors: ["Black"],
      cost: 4,
      isAlternate: false,
    },
    {
      level: 4,
      traits: ["Glowing Dawn"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-057", compiled);
