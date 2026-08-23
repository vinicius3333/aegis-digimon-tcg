// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// LM-007 Publimon
// [Security] At the end of the battle, play this card without paying the cost.
// [End of Attack] Place this Digimon on top of your security stack.
// Q3997: the [End of Attack] effect is mandatory if this Digimon is in the battle area.
// IR structure: Security trigger plays this card; separate EndOfAttack trigger places it on top of security.
// No [Main] trigger exists in the text; the earlier review misread the Security clause.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          toTop: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-007", compiled);
