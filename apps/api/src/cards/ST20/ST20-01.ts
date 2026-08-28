// @ts-nocheck
// Hand-authored override for ST20-01.
// runtime-effect fix: the +1000 DP applies only while "This Digimon with the [ADVENTURE]
// trait" — the trait gate was missing. Added a selfTopHasText condition requiring the
// [ADVENTURE] trait on this Digimon's own top card.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
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
          duration: "permanent",
          condition: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
            },
            raw: "this Digimon has the [ADVENTURE] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST20-01", compiled);
