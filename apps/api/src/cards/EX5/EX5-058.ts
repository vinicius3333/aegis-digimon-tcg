// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
            op: ">=",
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
            op: ">=",
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

// Fujitsumon is synthetic, but its printed reminder text is executable card
// behavior. Register it beside its creating card so every token-placement route
// receives the same continuous and deletion clauses.
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
