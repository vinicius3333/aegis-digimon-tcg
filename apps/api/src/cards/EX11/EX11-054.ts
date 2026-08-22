// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const matchingPlayed = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Reptile"], match: "trait" },
    { tokens: ["Dragonkin"], match: "trait" }
  ]
};
const progress = { controller: "mine", kind: ["Digimon"], keywords: ["Progress"] };
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer"
};

const reward = {
  kind: "Draw",
  controller: "mine",
  amount: 1,
  cost: suspendCost,
  optional: true,
  abortOnDecline: true
};
const boost = {
  kind: "ModifyDP",
  target: { filter: progress, count: 1 },
  amount: 3000,
  duration: "forTheTurn"
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }]
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: matchingPlayed, actions: [reward, boost] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: matchingPlayed, actions: [reward, boost] }
      ]
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true
    }
  ],
  coverage: "full",
  residual: []
};

registerIrCard("EX11-054", compiled);
