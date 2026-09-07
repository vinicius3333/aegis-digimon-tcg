import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "text",
                },
              ],
            },
            raw: "you have a card w/[Three Musketeers] in text",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            nameOrTrait: [
              { tokens: ["Three Musketeers"], match: "trait" },
              { tokens: ["TS"], match: "trait" },
            ],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          allowMultiColor: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            nameOrTrait: [
              { tokens: ["Three Musketeers"], match: "trait" },
              { tokens: ["TS"], match: "trait" },
            ],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          allowMultiColor: true,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
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
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Option"],
                zone: "digivolutionCardsOrLinkCards",
              },
              count: 1,
            },
            raw: "By trashing 1 Option card from any of your Digimon's digivolution cards or link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
    {
      trigger: "WhenAttacking",
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
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Option"],
                zone: "digivolutionCardsOrLinkCards",
              },
              count: 1,
            },
            raw: "By trashing 1 Option card from any of your Digimon's digivolution cards or link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
    {
      trigger: "Counter",
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
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Option"],
                zone: "digivolutionCardsOrLinkCards",
              },
              count: 1,
            },
            raw: "By trashing 1 Option card from any of your Digimon's digivolution cards or link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-1",
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestLevel",
            },
            count: 1,
          },
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          // The Option-side text specifies the host's bottom digivolution card.
          position: "bottom",
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, colors: ["Purple"], cost: 4, isAlternate: false },
    { level: 5, colors: ["Black"], cost: 4, isAlternate: false },
    {
      level: 5,
      texts: ["Three Musketeers"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT25-085", compiled);
