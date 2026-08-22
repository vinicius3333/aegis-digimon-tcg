// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const aqua = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Aqua"], match: "trait" },
    { tokens: ["Sea Animal"], match: "trait" }
  ]
};
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer"
};
const draw = { kind: "Draw", controller: "mine", amount: 1, cost: suspendCost, optional: true, abortOnDecline: true };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Aqua"], match: "trait" }, { tokens: ["Sea Animal"], match: "trait" }] },
              count: 1,
              from: ["hand"]
            },
            underFilter: aqua,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            raw: "By placing 1 level 5 or lower card with [Aqua] or [Sea Animal] in any of its traits from your hand as the bottom digivolution card of any of your [Aqua] or [Sea Animal] Digimon"
          },
          optional: true,
          abortOnDecline: true
        }
      ]
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: aqua, actions: [draw] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: aqua, actions: [draw] },
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: aqua,
          actions: [
            {
              kind: "Restrict",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
              condition: { kind: "triggerPlayedByDecode", raw: "played by ＜Decode＞" }
            }
          ]
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

registerIrCard("EX11-058", compiled);
