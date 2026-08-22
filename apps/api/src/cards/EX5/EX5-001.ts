// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX5-001 (Sunmon).
// runtime-effect fixes:
// - Inherited effect trigger: the text says "when an effect places the top card of this Digimon
//   in its digivolution cards" — this is NOT a free Digivolve action on [Your Turn].
//   It is a SubTrigger on onAddDigivolutionCards (the universal "cards were added to a Digimon's
//   digivolution stack" event; no separate "whenEffectPlacesInDigivolution"/"addedToHost" event or
//   filter field exists in the engine — those strings silently matched nothing).
//   KB Q3526: refers to e.g. EX5-007 Coronamon's inherited effect placing a card.
// - Action: when triggered, this Digimon may digivolve into a Digimon card in its hand with the
//   printed digivolution cost reduced by 1.
// Note: sourceFilter gates on the RECEIVING permanent (onAddDigivolutionCards' subject) being
// THIS Digimon via isSelfRef, mirroring BT20-080's established pattern for this event.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
              },
              from: ["hand"],
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-001", compiled);
