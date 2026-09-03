import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT21-013 (Agunimon). The declarative effect record dropped half of the
// [When Digivolving] destination clause and widened the source zones:
//   documented behavior CanSelectPermanent accepts the SOURCE permanent itself ("as this Digimon's
//   bottom digivolution card") OR a red Tamer with inherited effects, and CanSelectSourceCard
//   reads the hand and the trash only. With only the Tamer destination encoded, a controller
//   with no red Tamer in play resolved the effect to nothing, with no card selection at all.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Hero"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            or: [
              {
                hasInheritedEffects: true,
                kind: ["Tamer"],
                colors: ["Red"],
              },
              {
                isSelfRef: true,
              },
            ],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
            colors: ["Red"],
            nameOrTrait: [
              {
                tokens: ["Hybrid", "Hero"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["BurningGreymon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-013", compiled);
