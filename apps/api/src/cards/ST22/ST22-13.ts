import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Vortex",
          raw: "＜Vortex＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] [When Attacking] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, this Digimon gains +3000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] [When Attacking] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, this Digimon gains +3000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] [When Attacking] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, this Digimon gains +3000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["Vortex Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controllerDefault: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            raw: "your opponent has no unsuspended Digimon",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST22-13", compiled);
