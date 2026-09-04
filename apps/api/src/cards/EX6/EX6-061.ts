// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** HAND-FIXED IR: printed OR watcher, bottom-stack return, and Gate replacement. */
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            or: [
              { controller: "opponent", kind: ["Digimon"] },
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
              },
            ],
          },
          actions: [
            {
              kind: "ReturnTopDigivolutionCards",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              cardsPerTarget: 3,
              position: "bottom",
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
              condition: {
                kind: "boardCountCompare",
                left: "opponent",
                right: "mine",
                op: "lte",
                filter: { kind: ["Digimon", "Tamer"] },
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
                },
                from: ["trash"],
                count: 1,
              },
              underFilter: {
                controller: "mine",
                zone: "breeding",
                nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "nameExact" }],
              },
              position: "bottom",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-061", compiled);
