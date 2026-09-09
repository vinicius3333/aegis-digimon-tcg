import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By deleting 1 of your Digimon",
          },
          // "By deleting …," is an OPTIONAL processing condition (comprehensive 15-7-4): the
          // controller chooses whether to pay, and refusing skips the whole clause. Without
          // `optional` the sacrifice is forced — and Q3131 lets the cost be this Digimon itself,
          // so a lone Kimeramon would have had to delete itself on entry.
          optional: true,
          abortOnDecline: true,
          raw: "Delete 1 opponent level 3 Digimon.",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [4],
            },
            count: 1,
          },
          raw: "Delete 1 opponent level 4 Digimon.",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [5],
            },
            count: 1,
          },
          raw: "Delete 1 opponent level 5 Digimon.",
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
              levels: [3],
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By deleting 1 of your Digimon",
          },
          // "By deleting …," is an OPTIONAL processing condition (comprehensive 15-7-4): the
          // controller chooses whether to pay, and refusing skips the whole clause. Without
          // `optional` the sacrifice is forced — and Q3131 lets the cost be this Digimon itself,
          // so a lone Kimeramon would have had to delete itself on entry.
          optional: true,
          abortOnDecline: true,
          raw: "Delete 1 opponent level 3 Digimon.",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [4],
            },
            count: 1,
          },
          raw: "Delete 1 opponent level 4 Digimon.",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [5],
            },
            count: 1,
          },
          raw: "Delete 1 opponent level 5 Digimon.",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              // Printed `[Machinedramon]` is an exact-name reference, not a substring one.
              nameOrTrait: [
                {
                  tokens: ["Machinedramon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Purple", "Red"],
                levelComparison: {
                  op: "lte",
                  value: 4,
                },
              },
              count: 1,
            },
            raw: "By deleting 1 of your level 4 or lower purple or red Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Composite"],
      cost: 3,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          level: 4,
          traits: ["Composite"],
          differentCardNumbers: true,
        },
      ],
      count: 1,
      maxMaterials: 3,
    },
  ],
};

registerIrCard("BT19-070", compiled);
