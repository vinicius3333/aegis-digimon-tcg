import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-067 Kiyoshiro Higashimitarai.
// Q6870: "with [Jellymon] in its text" includes names, traits, effects, inherited effects,
// rules, and evolution/assembly requirements; the IR uses match:"text" rather than a name-only
// predicate. The [DS] branch remains a trait predicate.
// Q6871: the modal is one activation that uses one selected card; separate copies cannot consume
// multiple cards simultaneously through this effect.
// Q6872: cost reduction does not waive digivolution requirements, so no ignoreRequirements field
// is present. A prohibition on reducing play costs may remove only the reduction.
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
              { tokens: ["Jellymon"], match: "text" },
              { tokens: ["DS"], match: "trait" },
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
                "Digivolve the attacking Digimon into a level 6 or lower Jellymon/DS card",
                "Use a Jellymon/DS Option from hand",
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
                        { tokens: ["Jellymon"], match: "text" },
                        { tokens: ["DS"], match: "trait" },
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
                        { tokens: ["Jellymon"], match: "text" },
                        { tokens: ["DS"], match: "trait" },
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

registerIrCard("EX12-067", compiled);
