// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const iceSnowDigimon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" };
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer"
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] }, raw: "your opponent has a Digimon" } }]
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: opponentDigimon, count: 1 },
          amount: 1,
          scaling: { per: 1, filter: iceSnowDigimon, unit: "cards" }
        }
      ]
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: opponentDigimon,
          actions: [{ kind: "GainMemory", amount: 1, cost: suspendCost, optional: true, abortOnDecline: true }]
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

registerIrCard("EX11-057", compiled);
