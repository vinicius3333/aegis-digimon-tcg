import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-057 Monarchlizamon / Final Judgment. Audited against catalog erratum 2026-05-15
// and KB Q6341-Q6344. Its two [When Digivolving] effects are simultaneous; its battle is
// a standard rules battle; Final Judgment's grants last only for the turn.
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
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
            raw: "you have a card w/[Glowing Dawn] trait",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
    },
    {
      // Option side, "Final Judgment": [Main] 1 of your Digimon gains ＜Rush＞, ＜Security A. +1＞
      // and +5000 DP for the turn. Then, it may attack. `sameTarget` keeps all four actions on the
      // one Digimon chosen by the first.
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
