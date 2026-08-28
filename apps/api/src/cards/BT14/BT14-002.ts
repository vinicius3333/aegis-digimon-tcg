// @ts-nocheck
// Hand-authored override (errata 2023-12-15): "...no Digimon with MORE digivolution
// cards..." -> "...AS MANY OR MORE digivolution cards AS this Digimon..." (>=, encoded
// as `gte`). Inherited [Your Turn] <Jamming> self-grant gated on the corrected guard.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Jamming",
            raw: "＜Jamming＞",
          },
          duration: "permanent",
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCardsCompareToSource: "gte",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with as many or more digivolution cards as this Digimon",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-002", compiled);
