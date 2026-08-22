// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const red = { kind: "selfDigivolutionStackHasColor", filter: { colors: ["Red"] } };
const black = { kind: "selfDigivolutionStackHasColor", filter: { colors: ["Black"] } };
const both = { kind: "allOf", conditions: [red, black] };
const onlyRed = { kind: "allOf", conditions: [red, { kind: "not", condition: black }] };
const onlyBlack = { kind: "allOf", conditions: [black, { kind: "not", condition: red }] };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "DeleteBudget", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, budget: 6, upTo: true, chooseTargets: true, condition: both },
        { kind: "DeleteBudget", filter: { controller: "opponent", kind: ["Digimon"] }, budget: 6, upTo: true, chooseTargets: true, condition: onlyRed },
        { kind: "DeleteBudget", filter: { controller: "opponent", kind: ["Tamer"] }, budget: 6, upTo: true, chooseTargets: true, condition: onlyBlack },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: false,
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onDeletionOf",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [{ kind: "Unsuspend", target: { isSelfRef: true, count: 1, isSelf: true }, optional: true }],
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-070", compiled);
