// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          attackPlayer: false,
          optional: true,
          drainTimingWindowDuringAttack: true,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] },
            raw: "this Digimon has the [Insectoid] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-004", compiled);
export { compiled };
