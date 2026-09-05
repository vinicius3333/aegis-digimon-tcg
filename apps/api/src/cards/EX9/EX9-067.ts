// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Puppet", "LIBERATOR"],
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
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          digivolveIntoFilter: {
            nameOrTrait: [
              {
                tokens: ["Puppet"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  or: [
                    {
                      kind: ["Tamer"],
                      nameOrTrait: [
                        {
                          tokens: ["Arisa Kinosaki"],
                          match: "name",
                        },
                      ],
                    },
                    {
                      kind: ["Digimon"],
                      nameOrTrait: [
                        {
                          tokens: ["Puppet"],
                          match: "trait",
                        },
                      ],
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: true,
              reduceCostBy: 3,
              optional: true,
            },
          ],
          cost: {
            kind: "return",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            to: "deckBottom",
            raw: "by returning this Tamer to the bottom of the deck",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX9-067", compiled);
