// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Inherited [When Attacking]: cost trashes this Digimon's bottom face-down digivolution card
// — zone:"digivolutionCards" targets the card under this Digimon, not the Digimon itself.
// KB Q4748: can digivolve into a card just trashed by this effect.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.5"],
                match: "trait",
              },
            ],
            zone: "trash",
          },
          from: ["trash"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                faceDown: true,
                position: "bottom",
                sameHost: true,
                hostFilter: { isSelfRef: true },
              },
              count: 1,
            },
            raw: "By trashing this Digimon's bottom face-down digivolution card",
          },
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX9-006", compiled);
