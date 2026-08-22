// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const royalKnight = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] };
const drawAndMemory = {
  kind: "Suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
};
const drawOne = { kind: "Draw", controller: "mine", amount: 1 };
const royalKnightOnYourTurn = { kind: "allOf", conditions: [{ kind: "isYourTurn" }, { kind: "triggerSubjectMatchesFilter", filter: royalKnight }] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", actions: [
          { ...drawAndMemory, condition: royalKnightOnYourTurn },
          { ...drawOne, condition: royalKnightOnYourTurn },
          { kind: "GainMemory", amount: 1, condition: royalKnightOnYourTurn },
        ] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [
          { ...drawAndMemory, condition: royalKnightOnYourTurn },
          { ...drawOne, condition: royalKnightOnYourTurn },
          { kind: "GainMemory", amount: 1, condition: royalKnightOnYourTurn },
        ] },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "instead",
        sourceFilter: royalKnight,
        actions: [{
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Omekamon"], match: "name" }] }, count: 1 },
          from: ["hand"],
          payCost: false,
          optional: true,
        }],
      }],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["security"], payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-091", compiled);
