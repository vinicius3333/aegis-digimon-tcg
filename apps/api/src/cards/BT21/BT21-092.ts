// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT21-092 (Can't Turn My Back!).
// While you have a [Xros Heart] Digimon: ignore color requirements.
// [Main] Place all Digimon cards from 1 chosen [Xros Heart] Digimon's digivolution stack
// under 1 of your Tamers. Then you may play 1 [Xros Heart] Digimon from hand with play
// cost reduced by 1 per card this effect placed.
// KB Q4606: player may choose the order cards are placed.
// KB Q4607: placed cards go to the bottom of existing cards under the Tamer.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
            raw: "you have a Digimon with the [Xros Heart] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          // Moves the digivolution cards (not the Digimon itself) from the chosen [Xros Heart]
          // Digimon's stack to under 1 of your Tamers. Player chooses order (KB Q4606).
          // The count placed is tracked for the cost reduction below.
          kind: "MoveDigivolutionCards",
          sourceDigimonFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
          },
          cardFilter: { kind: ["Digimon"] },
          count: "all",
          to: {
            zone: "underTamer",
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
          },
          playerChoosesOrder: true,
          storeCountAs: "placedCount",
          raw: "Place all Digimon cards in 1 of your [Xros Heart] trait Digimon's digivolution cards under 1 of your Tamers",
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          reduceCostBy: "placedCount",
          raw: "you may play 1 Digimon card with the [Xros Heart] trait from your hand with the play cost reduced by 1 for each card this effect placed",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 5,
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-092", compiled);
