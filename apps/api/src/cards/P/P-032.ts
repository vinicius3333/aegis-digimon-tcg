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
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
              duration: "forTheTurn",
            },
          ],
          raw: "when this card is trashed by this Digimon's Digi-Burst, grant Jamming",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-032", compiled);
