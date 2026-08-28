// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "When effects trash this card from digivolution cards" → AllTurns SubTrigger on
// whenTrashedFromDigivolutionCards (fires whenever the card is trashed from under a Digimon).
// "While you have a [Three Musketeers] trait Digimon, can ignore color requirements" → Static
// WaiveColorRequirement with youHave condition.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardDiscarded",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    value: 7000,
                  },
                },
                count: 1,
              },
            },
          ],
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
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a [Three Musketeers] trait Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trash",
          controller: "opponent",
          amount: 1,
          toTop: true,
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
          },
          position: "bottom",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestDP",
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-180", compiled);
