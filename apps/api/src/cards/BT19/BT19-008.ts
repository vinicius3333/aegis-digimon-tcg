// HAND-FIXED IR for BT19-008 — do not regenerate.
// YourTurn inherited GainKeyword Rush: added Xros Heart trait condition on target.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["OmniShoutmon"],
                match: "name",
              },
            ],
          },
          onto: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          optional: true,
          payCost: false,
          from: ["underTamers"],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "play",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-008", compiled);
