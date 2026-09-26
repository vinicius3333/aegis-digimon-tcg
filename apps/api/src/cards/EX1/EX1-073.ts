import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [5],
              colors: ["Red", "Black"],
              nameOrTrait: [{ tokens: ["Cyborg"], match: "trait" }],
            },
            count: 5,
            upTo: true,
            from: ["hand", "trash"],
            distinctCardNumbers: true,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
          trackCount: "placedCyborgs",
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { per: 1, unit: "namedCount", countSource: "placedCyborgs" },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "dpImmune",
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      description:
        "[All Turns]When this Digimon would be deleted, you may trash 2 level5 Digimon cards in this Digimon's digivolution cards to prevent this Digimon from being deleted.",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "trash",
                target: {
                  filter: { zone: "digivolutionCards", isSelfRef: true, kind: ["Digimon"], levels: [5] },
                  count: 2,
                },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-073", compiled);
