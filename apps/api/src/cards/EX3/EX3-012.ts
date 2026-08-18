// HAND-FIXED IR for EX3-012 (Volcanicdramon) — do not regenerate over this file.
//
// The generator miscompiled the [On Play] clause three ways: the Delete dropped the
// "with the LOWEST DP" superlative (deleting ALL opponent Digimon), the play
// prohibition dropped its "5000 DP or less" scope, and the "If no Digimon is deleted
// by this effect" gate compiled to a raw condition (always unmet). The printed text:
// "[On Play] Delete all of your opponent's Digimon with the lowest DP. If no Digimon
// is deleted by this effect, your opponent can't play Digimon with 5000 DP or less
// until the end of their turn."
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              superlative: "lowestDP",
            },
            count: "all",
          },
        },
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: {
            kind: ["Digimon"],
            dpAtMost: 5000,
          },
          mode: "play",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon is deleted by this effect",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-012", compiled);
