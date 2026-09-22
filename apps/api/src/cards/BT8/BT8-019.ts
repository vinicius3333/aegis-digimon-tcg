import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: 1,
            bindAs: "spared",
            upTo: true,
          },
          chooser: "opponent",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              zone: "battleArea",
              excludeSelf: true,
              excludeSelectionRef: "spared",
            },
            count: "all",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              kind: ["Digimon"],
            },
            unit: "deletedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          raw: "When an opponent's Digimon is deleted",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
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
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-019", compiled);
