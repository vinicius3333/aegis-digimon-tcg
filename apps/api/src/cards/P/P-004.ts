import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-IR override (header removed so the generator preserves this file). The runtime record
// cannot emit the whenDigivolutionTrashed SubTrigger consumer.
//
// P-004 Gomamon — [Inherited] "When you trash a digivolution card of 1 of your opponent's
// Digimon, gain 1 memory." KB authority (node tools/kb/query.mjs card P-004):
//   Q4113 (2024-03-28): a return-to-hand bounce that clears the opponent's digivolution cards
//     does NOT count as "trashing digivolution" for this effect — so it must not trigger. The
//     Wave-1 (08-01) seam fires whenDigivolutionTrashed only at the genuine effect-trash site
//     (trashDigivolutionCards); a bounce routes through returnToHand and never fires it.
// Gates: subjectFilter "an opponent's Digimon" (the host of the trashed card) + triggerByYourEffect
//   ("when YOU trash", from the Wave-1 byEffectSeat payload). P-004 is an Inherited (ESS) effect.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "triggerByYourEffect",
                raw: "when YOU trash a digivolution card",
              },
            },
          ],
          raw: "[Inherited] When you trash a digivolution card of 1 of your opponent's Digimon, gain 1 memory.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-004", compiled);
