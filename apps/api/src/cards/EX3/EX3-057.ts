// HAND-VERIFIED IR for EX3-057 Growlmon — preserve the errata timing and delete-outcome branch.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The shared interpreter executes this reviewed IR; removing the generated header
// keeps the compiler from restoring the pre-audit watcher.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon was deleted by this effect",
          },
          ifTrue: [
            {
              kind: "TrashTopDeck",
              controller: "both",
              amount: 2,
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
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
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By deleting 1 of your other Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Guilmon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-057", compiled);
