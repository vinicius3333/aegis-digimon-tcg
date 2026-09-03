import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-073 Sangloupmon
// inheritedEffectText: [When Attacking] This Digimon may digivolve into a Digimon card
// with [Undead] or [Dark Animal] in its traits from your trash for its digivolution cost.
//
// KB Q1866: cannot ignore digivolution requirements (payCost:true, standard requirements apply).
// KB Q1867: [When Attacking] effects added mid-attack do not fire retroactively.
//
// Fix: added `from: ["trash"]` to ensure the digivolution source is restricted to trash.
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
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Undead", "Dark Animal"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-073", compiled);
