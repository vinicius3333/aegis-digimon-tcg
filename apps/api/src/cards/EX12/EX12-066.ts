import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-066 Hiro Amanokawa.
// Q6867: "with [Gammamon] in its text" includes the card's name, traits, effects,
// inherited effects, rules, and evolution requirements; the text filter therefore uses
// match:"text" and is intentionally not limited to the main effect text.
// Q6868: each trigger is anchored to its own Tamer and pays the printed suspend cost;
// the engine's simultaneous-use gate prevents multiple copies from consuming the same
// selected card at once.
// Q6869: the effect may activate even when a cost-reduction prohibition is present; the
// digivolve remains legal and simply pays its unmodified cost. No requirement waiver is
// encoded because the printed text does not say to ignore digivolution requirements.
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
              { tokens: ["Gammamon"], match: "text" },
              { tokens: ["VB"], match: "trait" },
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
                "Digivolve the attacking Digimon into a level 6 or lower Gammamon/VB card",
                "Use a Gammamon/VB Option from hand",
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
                        { tokens: ["Gammamon"], match: "text" },
                        { tokens: ["VB"], match: "trait" },
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
                        { tokens: ["Gammamon"], match: "text" },
                        { tokens: ["VB"], match: "trait" },
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

registerIrCard("EX12-066", compiled);
