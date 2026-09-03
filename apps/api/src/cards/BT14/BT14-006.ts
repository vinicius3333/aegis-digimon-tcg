import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          handTrashedController: "mine",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true, location: "battleArea" }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Dark Animal", "SoC"], match: "trait" }],
              },
              from: ["trash"],
              source: "triggerTrashedFromHand",
              payCost: true,
              optional: true,
            },
          ],
          raw: "When a [Dark Animal] or [SoC] Digimon card is trashed from your hand, this Digimon may digivolve into that card.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-006", compiled);
