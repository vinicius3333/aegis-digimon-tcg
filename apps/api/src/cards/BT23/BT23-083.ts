// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base", "CS"], match: "trait" }],
            },
            raw: "you have a Digimon with the [Royal Base] or [CS] trait",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "allOf",
            conditions: [
              { kind: "triggerSecurityIsYours" },
              {
                kind: "triggerAddedSecurityHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Zaxon", "Royal Base"], match: "trait" }] },
              },
            ],
          },
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "ifThisEffectActed", raw: "by suspending this Tamer" },
            },
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "allOf",
                conditions: [
                  { kind: "ifThisEffectActed", raw: "by suspending this Tamer" },
                  {
                    kind: "zoneCount",
                    seat: "mine",
                    zone: "hand",
                    op: "lte",
                    value: 7,
                    raw: "you have 7 or fewer cards in your hand",
                  },
                ],
              },
            },
          ],
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

registerIrCard("BT23-083", compiled);
export { compiled };
