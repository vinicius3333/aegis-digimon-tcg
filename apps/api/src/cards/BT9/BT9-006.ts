import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-006 Pagumon (Digi-Egg)
// Inherited: "[When Attacking] You may trash 1 card in your hand to have this Digimon
// get +1000 DP for the turn."
// Fix 1: The trash cost targets "1 card in your hand" — any kind; the cost.target.filter
//   had no kind restriction already (correct), but the ModifyDP target used
//   controllerDefault:"mine" with kind:["Digimon"] instead of isSelfRef targeting
//   this Digimon specifically.
// Fix 2: The ModifyDP +1000 is present but uses a generic own-Digimon filter;
//   it should target this Digimon (self-ref), not an arbitrary own Digimon.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "by trashing 1 card in your hand",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-006", compiled);
