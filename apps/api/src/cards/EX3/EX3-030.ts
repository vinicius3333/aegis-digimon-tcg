// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR for EX3-030 (errata 2022-11-11, Q3406/Q3407).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                excludeNameOrTrait: [
                  {
                    tokens: ["Three Great Angels"],
                    match: "trait",
                  },
                ],
                controllerDefault: "mine",
                colors: ["Yellow"],
                nameOrTrait: [
                  {
                    tokens: ["Angel", "Cherub", "Throne", "Authority", "Seraph", "Virtue"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Four Great Dragons"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Four Great Dragons"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                sourceRef: "triggerSubject",
              },
              keyword: {
                keyword: "Rush",
                raw: "＜Rush＞",
              },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-030", compiled);
