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
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 2000,
          },
          while: {
            kind: "anyOf",
            conditions: [
              {
                kind: "allOf",
                conditions: [
                  {
                    kind: "selfHasTrait",
                    filter: { nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "trait" }] },
                  },
                  {
                    kind: "not",
                    condition: {
                      kind: "selfHasTrait",
                      filter: { nameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] },
                    },
                  },
                ],
              },
              {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
              },
            ],
            raw: "this Digimon has [Beast], [Animal], or [Sovereign], other than [Sea Animal], in one of its traits or the [Royal Knight] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-051", compiled);
