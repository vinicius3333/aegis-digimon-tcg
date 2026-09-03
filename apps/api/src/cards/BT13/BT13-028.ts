import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Kiyoshiro Higashimitarai"], match: "nameExact" }],
        },
        raw: "If you have [Kiyoshiro Higashimitarai]",
      },
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["TeslaJellymon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Jellymon"], match: "nameExact" }],
          },
          position: "bottom",
          bindHostAs: "thetismonJellymonHost",
          abortOnDecline: true,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "thetismonJellymonHost",
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Thetismon"],
                match: "nameExact",
              },
            ],
          },
          from: ["hand"],
          source: "triggerSource",
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Jellymon"],
                    match: "text",
                  },
                ],
              },
              count: 3,
            },
            orderReturnedCards: true,
            raw: "By returning 3 cards with [Jellymon] in their text from your trash at the bottom of the deck in any order",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-028", compiled);
