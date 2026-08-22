// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5173: the Sunarizamon branch is conditional on paying the Close-return cost.
// Q5743: the nested played card's own Start Main Phase effect is not activated
// by this same timing window.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Close"], match: "nameExact" }] }, count: 1 },
          from: ["hand"],
          payCost: false,
          optional: true,
          cost: { kind: "return", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, to: "deckBottom", raw: "By returning this Tamer to the bottom of the deck" },
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", zone: "trash", nameOrTrait: [{ tokens: ["Sunarizamon"], match: "nameExact" }] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed", raw: "if you did" }, { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"] }, raw: "you don't have a Digimon" }] },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenDigivolutionTrashed",
        sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
        actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "suspend", raw: "by suspending this Tamer" } }],
      }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-063", compiled);
export default compiled;
