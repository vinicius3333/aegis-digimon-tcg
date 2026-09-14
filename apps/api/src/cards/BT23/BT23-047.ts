import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT23-047 (Examon).
// [Your Turn][Once Per Turn] SubTrigger whenSecurityRemoved: watches the opponent's stack,
// regardless of which of the controller's effects or attacks removed the card.
// The [Once Per Turn] frequency on the outer effect gates the whole trigger.
export const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
  ],
  digivolutionRequirement: [{ level: 6, traits: ["CS"], cost: 5, isAlternate: true }],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
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
          keyword: "Partition",
          raw: "＜Partition (green Lv.5 & blue Lv.5)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend 5 of your opponent's Digimon or Tamers. None of your opponent's Digimon can unsuspend in their next unsuspend phase.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 5,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
        {
          effectTextPart: "Then, this Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend 5 of your opponent's Digimon or Tamers. None of your opponent's Digimon can unsuspend in their next unsuspend phase.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 5,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentNextUnsuspendPhase",
        },
        {
          effectTextPart: "Then, this Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "opponent",
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] [Once Per Turn] When your opponent's security stack is removed from, trash 1 of their Option cards in the battle area.",
              kind: "Trash",
              target: {
                filter: {
                  zone: "battleArea",
                  controller: "opponent",
                  kind: ["Option"],
                  placedInBattleAreaByEffect: true,
                },
                count: 1,
              },
            },
            {
              effectTextPart: "Then, delete 1 of their suspended Digimon or Tamers.",
              kind: "Delete",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  suspended: true,
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-047", compiled);
