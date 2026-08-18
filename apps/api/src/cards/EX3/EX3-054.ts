// HAND-FIXED IR for EX3-054 Darkdramon — do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          raw: "When you would digivolve into this card",
          sourceFilter: {
            controllerDefault: "mine",
          },
          into: {
            nameOrTrait: [
              {
                tokens: ["Darkdramon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["D-Brigade"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 5,
                  upTo: true,
                },
                raw: "by returning up to 5 cards with [D-Brigade] in their traits from your trash to the top of your deck",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          raw: "When you play another Digimon with [D-Brigade] in its traits",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLteTriggerSource: true,
                },
                count: 1,
              },
            },
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-054", compiled);
