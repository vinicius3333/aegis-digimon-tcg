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
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
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
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "[End of Attack] [On Deletion] You may trash 1 [Hybrid] or [Ten Warriors] trait card from your hand. If this effect trashed, ＜Draw 2＞",
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect trashed",
          },
        },
        {
          effectTextPart:
            "Then, you may play 1 red, blue or green Tamer card with inherited effects from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Red", "Blue", "Green"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "[End of Attack] [On Deletion] You may trash 1 [Hybrid] or [Ten Warriors] trait card from your hand. If this effect trashed, ＜Draw 2＞",
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect trashed",
          },
        },
        {
          effectTextPart:
            "Then, you may play 1 red, blue or green Tamer card with inherited effects from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Red", "Blue", "Green"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 4000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Takuya Kanbara"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("AD1-002", compiled);
