import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST10-02 Salamon.
// [Inherited][End of Your Turn] DNA digivolve this Digimon (which has this card in its
//   digivolution cards) + one other of your Digimon in play, into a Digimon in your hand
//   that has [DNA Digivolve], paying the digivolve cost.
// KB Q724: must have [DNA Digivolve] in target; Q725: can't ignore digivolve requirements.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: {
                isSelfRef: true,
              },
              zone: "battleArea",
              count: 1,
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              zone: "battleArea",
              count: 1,
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasDnaDigivolutionRequirement: true,
              zone: "hand",
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST10-02", compiled);
