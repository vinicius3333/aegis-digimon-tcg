import type { CompiledCard, Condition } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const red: Condition = { kind: "selfDigivolutionStackHasColor", filter: { colors: ["Red"] } };
const black: Condition = { kind: "selfDigivolutionStackHasColor", filter: { colors: ["Black"] } };
const both: Condition = { kind: "allOf", conditions: [red, black] };
const onlyRed: Condition = { kind: "allOf", conditions: [red, { kind: "not", condition: black }] };
const onlyBlack: Condition = { kind: "allOf", conditions: [black, { kind: "not", condition: red }] };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeleteBudget",
          filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          budget: 6,
          upTo: true,
          condition: both,
        },
        {
          kind: "DeleteBudget",
          filter: { controller: "opponent", kind: ["Digimon"] },
          budget: 6,
          upTo: true,
          condition: onlyRed,
        },
        {
          kind: "DeleteBudget",
          filter: { controller: "opponent", kind: ["Tamer"] },
          budget: 6,
          upTo: true,
          condition: onlyBlack,
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: false,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: {}, isSelfRef: true, count: 1, isSelf: true },
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

registerIrCard("BT8-070", compiled);
