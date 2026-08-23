// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3763: digivolve into Diaboromon does NOT ignore digivolution requirements.
// Both Digivolve actions carry ignoreReqs:false to make this explicit.
export const compiled: CompiledCard = {
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
                tokens: ["Diaboromon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          ignoreReqs: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Diaboromon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By deleting 1 of your Digimon with [Diaboromon] in its name",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
                tokens: ["Diaboromon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          ignoreReqs: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Diaboromon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By deleting 1 of your Digimon with [Diaboromon] in its name",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Diaboromon"],
                match: "name",
              },
            ],
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
              stopAtLevel: 3,
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

registerIrCard("EX6-041", compiled);
