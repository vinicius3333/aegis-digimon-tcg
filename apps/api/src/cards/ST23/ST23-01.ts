// @ts-nocheck
// Hand-authored override for ST23-01 (Kekkomon, DigiEgg).
// Fix: cost "by trashing the bottom face-down card from under any of your Tamers"
// targets a digivolution card beneath a Tamer (zone:"digivolutionCards" +
// hostFilter kind:["Tamer"]), NOT the Tamer permanent itself.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
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
                tokens: ["Glowing Dawn"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "By trashing the bottom face-down card from under any of your Tamers",
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

registerIrCard("ST23-01", compiled);
