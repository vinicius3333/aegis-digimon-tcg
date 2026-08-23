// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Audited IR for BT2-082. The generated form treated the battle-deletion clause as an
// "instead" side effect: it deleted another Diaboromon but did not prevent this Digimon's
// deletion. Q1031/Q1034 require a genuine prevention replacement, and its cause is battle only.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          leaveCause: "byBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Diaboromon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-082", compiled);
