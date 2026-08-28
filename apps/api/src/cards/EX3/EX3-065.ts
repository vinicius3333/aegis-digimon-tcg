// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dragonTraits = [
  { tokens: ["Rock Dragon"], match: "trait" },
  { tokens: ["Earth Dragon"], match: "trait" },
  { tokens: ["Machine Dragon"], match: "trait" },
  { tokens: ["Sky Dragon"], match: "trait" },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"], zone: "battleArea" },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: dragonTraits },
          actions: [
            {
              kind: "ActivateEffect",
              target: { sourceRef: "triggerSubject" },
              effectType: "OnPlay",
              count: 1,
              asEffectOf: "this Tamer",
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-065", compiled);
