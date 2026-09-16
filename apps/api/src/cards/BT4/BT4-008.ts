import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Return",
              target: { filter: { isSelfRef: true, zone: "trash" }, count: 1 },
              to: "hand",
            },
          ],
          raw: "When this card is trashed due to activating this Digimon's ＜Digi-Burst＞, return this card to its owner's hand",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-008", compiled);
