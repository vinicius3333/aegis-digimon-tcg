import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1703: opponent chooses 1 of their Digimon; delete all Digimon (both players)
// except this Digimon and opponent's chosen Digimon; gain 1 memory per deleted Digimon.
// KB Q1704/Q1705: breeding area Digimon cannot be chosen or deleted → zone:"battleArea".
// KB Q1706: if opponent has no Digimon, delete all other own Digimon; gain memory per deleted.
// upTo:true is correct for Q1706 — opponent chooses 0 when they have no Digimon.
// "excludeSelectionRef" on Target is a new capability (see LANE_H.md).
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
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-019", compiled);
