import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-068 Ruli Tsukiyono.
// Q6873: "with [Angoramon] in its text" includes names, traits, effects, inherited effects,
// rules, and evolution/assembly requirements; match:"text" intentionally covers that scope.
// Q6874: one activation uses one selected card; multiple copies cannot combine this card's
// reductions by consuming multiple cards at once.
// Q6875: the effect may activate when cost reduction is prohibited, but it never waives
// digivolution requirements. No ignoreRequirements field is present.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "memoryAtMost", value: 2 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Angoramon"], match: "text" },
              { tokens: ["NSp"], match: "trait" },
            ],
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          actions: [
            {
              kind: "Modal",
              choose: 1,
              labels: [
                "Digivolve the attacking Digimon into a level 6 or lower Angoramon/NSp card",
                "Use an Angoramon/NSp Option from hand",
              ],
              options: [
                [
                  {
                    kind: "Digivolve",
                    target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
                    into: {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      levelComparison: { op: "lte", value: 6 },
                      nameOrTrait: [
                        { tokens: ["Angoramon"], match: "text" },
                        { tokens: ["NSp"], match: "trait" },
                      ],
                    },
                    from: ["hand"],
                    payCost: true,
                    reduceCost: 1,
                    optional: true,
                    abortOnDecline: true,
                  },
                ],
                [
                  {
                    kind: "UseOptionWithoutCost",
                    filter: {
                      controller: "mine",
                      kind: ["Option"],
                      nameOrTrait: [
                        { tokens: ["Angoramon"], match: "text" },
                        { tokens: ["NSp"], match: "trait" },
                      ],
                    },
                    from: ["hand"],
                    payCost: true,
                    reduceCostBy: 2,
                    optional: true,
                  },
                ],
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-068", compiled);
