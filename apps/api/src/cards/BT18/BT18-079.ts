// @ts-nocheck
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
          kind: "TrashTopDeck",
          controller: "both",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            unit: "colors",
          },
          trackCount: "trashedThisEffect",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "trashedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            unit: "colors",
          },
          trackCount: "trashedThisEffect",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "trashedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
                levelComparison: {
                  op: "lte",
                  value: 4,
                },
              },
              count: 1,
            },
            raw: "By deleting 1 level 4 or lower purple Digimon",
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
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koichi Kimura"],
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Duskmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-079", compiled);
export { compiled };
