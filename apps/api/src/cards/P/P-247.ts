import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-247 Nyaromon is a DigiEgg whose only printed text is one inherited effect:
// "[When Attacking] [Once Per Turn] By trashing 1 [Dark Animal], [Shaman], [Undead] or [TS]
// trait card from your hand, delete 1 of your opponent's unsuspended level 4 or lower Digimon."
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              unsuspended: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Dark Animal", "Shaman", "Undead", "TS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 [Dark Animal], [Shaman], [Undead] or [TS] trait card from your hand",
          },
          // CR 15-7-4 leaves the "By ..." processing condition to the player, and 15-7-2 stops
          // the payload when it is declined. Peers P-149 and ST16-11 carry the same shape.
          optional: true,
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

registerIrCard("P-247", compiled);
