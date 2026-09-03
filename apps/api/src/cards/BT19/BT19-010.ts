import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          mode: "instead",
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  zone: "digivolutionCards",
                  kind: ["Digimon"],
                  // The printed source is this Digimon's stack, not every friendly stack.
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart"],
                      match: "trait",
                    },
                  ],
                },
                count: 3,
                upTo: true,
                from: ["digivolutionCards"],
              },
              underFilter: {
                controller: "mine",
                kind: ["Tamer"],
              },
            },
          ],
          optional: true,
          raw: "you may place up to 3 Digimon cards with the [Xros Heart] trait from this Digimon's digivolution cards under 1 of your Tamers",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        { names: ["Shoutmon"] },
        { names: ["Ballistamon"] },
        { names: ["Dorulumon"] },
        { names: ["Starmons"] },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT19-010", compiled);
