// @ts-nocheck
// Hand-fixed: inherited DnaDigivolve needs 2 materials (self + one other in play),
// into must be from hand and have DNA digivolution requirement (KB Q787-789).
// [Opponent's Turn] restriction effect: no [Main] tag — static passive, finding #1 is FP.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beDeleted",
          byOpponentEffectsOnly: true,
          duration: "permanent",
        },
      ],
    },
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
              count: 1,
              isSelf: true,
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
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
registerIrCard("ST13-13", compiled);
