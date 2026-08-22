// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mineralRock = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }, { tokens: ["Rock"], match: "trait" }]
};
const suspendCost = { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" };
const place = {
  kind: "PlaceUnder",
  target: { filter: mineralRock, count: 1 },
  from: ["hand", "trash"],
  position: "bottom",
  underFilter: { isTriggerSource: true },
  cost: suspendCost,
  optional: true,
  abortOnDecline: true
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"], zone: ["hand", "digivolutionCards"], nameOrTrait: [{ tokens: ["Mineral"], match: "trait" }, { tokens: ["Rock"], match: "trait" }] }, count: 1 }, raw: "By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards" }, optional: true, abortOnDecline: true }]
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: mineralRock, actions: [place] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: mineralRock, actions: [place] }
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

registerIrCard("EX11-065", compiled);
