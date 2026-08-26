// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** HAND-FIXED IR: the played/digivolved subject must have one printed Angel trait. */
const angelTrait = { nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels"], match: "trait" }] };
const gainMemory = {
  kind: "GainMemory",
  amount: 1,
  condition: { kind: "triggerSubjectMatchesFilter", filter: angelTrait },
  cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
  optional: true,
  abortOnDecline: true,
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] }, count: 1 },
          keyword: { keyword: "Barrier" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] }, count: 1 },
          keyword: { keyword: "Barrier" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [gainMemory],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [gainMemory],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-063", compiled);
