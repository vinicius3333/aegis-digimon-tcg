import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-081 Owen Dreadnought (Tamer):
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [End of Your Turn] By suspending this Tamer, give <Piercing> to 1 of your
//   [Reptile]/[Dragonkin] trait Digimon for the turn, and that Digimon attacks.
// [Security] Play this card without paying the cost.
//
// KB Q4593: the chosen Digimon must attack if possible; can't choose not to attack.
// KB Q4594: second copy can't trigger another attack if already mid-attack.

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Reptile", "Dragonkin"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            bindAs: "piercingTarget",
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "piercingTarget",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            fromSelectionRef: "piercingTarget",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-081", compiled);
