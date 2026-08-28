// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4127: a Diaboromon token counts because its exact card name is [Diaboromon].
// KB Q4128: this card counts itself when calculating the Security Attack bonus.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "permanent",
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-016", compiled);
