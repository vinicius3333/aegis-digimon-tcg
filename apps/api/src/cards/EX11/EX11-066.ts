// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const vemmonText = { nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] };
const vemmonDigimon = { controller: "mine", kind: ["Digimon"], ...vemmonText };
const trashCost = { kind: "trash", target: { filter: { zone: "hand", controller: "mine", ...vemmonText }, count: 1 }, raw: "By trashing 1 card with [Vemmon] in its text from your hand" };
const suspendCost = { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1, cost: trashCost, optional: true, abortOnDecline: true },
        { kind: "GainMemory", amount: 1 }
      ]
    },
    {
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1, cost: trashCost, optional: true, abortOnDecline: true },
        { kind: "GainMemory", amount: 1 }
      ]
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: vemmonDigimon,
          actions: [{ kind: "RevealAdd", revealCount: 2, add: [{ filter: vemmonText, count: "all", to: "placeUnder", underFilter: { isTriggerSource: true } }], rest: "trash", cost: suspendCost, optional: true, abortOnDecline: true }]
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: vemmonDigimon,
          actions: [{ kind: "RevealAdd", revealCount: 2, add: [{ filter: vemmonText, count: "all", to: "placeUnder", underFilter: { isTriggerSource: true } }], rest: "trash", cost: suspendCost, optional: true, abortOnDecline: true }]
        }
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

registerIrCard("EX11-066", compiled);
