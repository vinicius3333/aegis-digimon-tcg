import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Close"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            to: "deckBottom",
            raw: "by returning this Tamer to the bottom of the deck",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [{ tokens: ["Sunarizamon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "ifThisEffectActed" },
              { kind: "youHaveNone", filter: { controller: "mine", kind: ["Digimon"] } },
            ],
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
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
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-063", compiled);

export { compiled };
