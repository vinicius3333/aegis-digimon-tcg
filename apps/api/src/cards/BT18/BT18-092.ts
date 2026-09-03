import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Vemmon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 [Vemmon] in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          optional: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if you trashed [Vemmon] for this effect",
          },
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
          },
          actions: [
            {
              kind: "DeDigivolve",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 1,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer and returning 2 [Vemmon] from that Digimon's digivolution cards to the bottom of the deck",
              },
              optional: true,
              additionalCosts: [
                {
                  kind: "return",
                  target: {
                    filter: {
                      controller: "mine",
                      zone: "digivolutionCards",
                      sameHost: true,
                      hostFilter: { sourceRef: "triggerSubject" },
                      nameOrTrait: [
                        {
                          tokens: ["Vemmon"],
                          match: "name",
                        },
                      ],
                    },
                    count: 2,
                  },
                  to: "deckBottom",
                  raw: "returning 2 [Vemmon] from that Digimon’s digivolution cards to the bottom of the deck",
                },
              ],
              abortOnDecline: true,
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
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-092", compiled);
export { compiled };
