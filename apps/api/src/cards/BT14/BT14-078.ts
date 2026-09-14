import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Deletion]: trash up to 3 (optional "you may"), then delete is mandatory (no "you may").
// The deletion ceiling is driven by the preceding hand-trash count.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart: "[End of Your Turn] Delete this Digimon and ＜Draw 2＞.",
          kind: "Delete",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
        {
          effectTextPart: "[End of Your Turn] Delete this Digimon and ＜Draw 2＞.",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart: "Then, you may return 1 [Loogamon] from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Loogamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[On Deletion] You may trash up to 3 cards with the [Dark Animal] or [SoC] trait in your hand.",
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dark Animal", "SoC"],
                  match: "trait",
                },
              ],
            },
            count: 3,
            upTo: true,
          },
          trackCount: "trashedThisEffect",
          optional: true,
        },
        {
          effectTextPart:
            "Then, delete 1 of your opponent's level 3 or lower Digimon. For each card trashed by this effect, add 1 to the level this effect may choose.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "trashedThisEffect",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-078", compiled);
