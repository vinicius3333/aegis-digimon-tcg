// @ts-nocheck
// EX9-018 MetalMamemon — hand-fixed IR.
// KB Q4760: trash digivolution cards from exactly 1 opponent Digimon (count:1 enforces this).
// KB Q4761: the placement cost gates the "then" return; the trash operation itself may be a
// no-op when the chosen opponent Digimon has no sources, after which the return still resolves.
// Scaling counts THIS Digimon's face-down digivolution cards.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the play cost by 2",
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Cyborg", "Ver.2"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                raw: "by trashing 1 [Cyborg] or [Ver.2] trait card from your hand",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "true" },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
          ifTrue: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: 1,
                upTo: false,
              },
              amount: 1,
              choose: true,
              scaling: {
                per: 1,
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  faceDown: true,
                },
                unit: "selfFaceDownDigivolutionCards",
              },
            },
            {
              kind: "Return",
              target: {
                filter: {
                  digivolutionCards: "none",
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "deckBottom",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: { kind: "true" },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card from your trash face down as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
          ifTrue: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: 1,
                upTo: false,
              },
              amount: 1,
              choose: true,
              scaling: {
                per: 1,
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  faceDown: true,
                },
                unit: "selfFaceDownDigivolutionCards",
              },
            },
            {
              kind: "Return",
              target: {
                filter: {
                  digivolutionCards: "none",
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "deckBottom",
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Mamemon"],
      cost: 1,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    },
  ],
};
registerIrCard("EX9-018", compiled);
