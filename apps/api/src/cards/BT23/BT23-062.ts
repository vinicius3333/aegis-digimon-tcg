import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Undead", "Dark Animal", "CS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trash 1 card with the [Undead], [Dark Animal] or [CS] trait from your hand",
          },
          // CR 15-7-4: the player chooses whether to execute an optional processing
          // condition ("By ..., gain 1 memory"), and 15-7-2 stops the payload when they
          // decline. Peer BT11-092 carries the same printed shape and the same pair.
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Undead", "Dark Animal"],
                match: "trait",
              },
            ],
            zone: "trash",
          },
          from: ["trash"],
          payCost: true,
          optional: true,
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
      level: 2,
      traits: ["CS"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-062", compiled);
