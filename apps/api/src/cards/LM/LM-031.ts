// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Black"],
          },
          from: ["hand"],
          reduceCost: 3,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
            },
            count: 1,
          },
          to: "deckTop",
          from: ["trash"],
          mandatory: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              dp: {
                op: "lte",
                value: 2000,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you don't have a Digimon",
          },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      condition: {
        kind: "opponentHas",
        filter: {
          controllerDefault: "opponent",
          kind: ["Digimon"],
        },
        raw: "your opponent has a Digimon",
      },
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Black"],
              dp: {
                op: "lte",
                value: 2000,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-031", compiled);
