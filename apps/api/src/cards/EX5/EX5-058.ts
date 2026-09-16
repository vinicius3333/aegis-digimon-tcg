import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ConditionalBranch",
          ifTrue: [
            {
              kind: "PlayToken",
              tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
              count: 1,
              payCost: false,
              suspended: true,
            },
          ],
          ifFalse: [
            {
              kind: "PlayToken",
              tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
              count: 1,
              payCost: false,
              suspended: true,
              placedAs: "opponentDigimon",
            },
          ],
          condition: {
            kind: "totalDigimonCount",
            op: "gte",
            value: 4,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ConditionalBranch",
          ifTrue: [
            {
              kind: "PlayToken",
              tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
              count: 1,
              payCost: false,
              suspended: true,
            },
          ],
          ifFalse: [
            {
              kind: "PlayToken",
              tokens: [{ name: "Fujitsumon Token", kind: "Digimon", color: "Purple", dp: 3000 }],
              count: 1,
              payCost: false,
              suspended: true,
              placedAs: "opponentDigimon",
            },
          ],
          condition: {
            kind: "totalDigimonCount",
            op: "gte",
            value: 4,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            zone: "battleArea",
            kind: ["Digimon"],
            byEffect: true,
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-058", compiled);

registerIrCard("TOKEN-Fujitsumon-Token", {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "unsuspend",
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
});
