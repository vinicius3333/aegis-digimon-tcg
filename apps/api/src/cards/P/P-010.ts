// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-maintained: Q4115 requires an exact [Agumon] digivolution card.
const compiled: CompiledCard = {
  effects: [
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
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [{ tokens: ["Agumon"], match: "nameExact" }],
            },
            raw: "this Digimon has an [Agumon] digivolution card",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-010", compiled);
