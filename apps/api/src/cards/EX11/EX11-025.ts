import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Start of Your Main Phase] "Add your top face-DOWN security card to the hand." The printed
// wording skips face-up security cards, which this very card (and EX11-030) create by placing a
// [Royal Base] Digimon face up. `faceDownOnly` is the security seam's face-state filter; without
// it the effect takes the literal top card even when an effect left it revealed (KB Q5812/Q5813).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "permanent",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
          faceDownOnly: true,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          faceUp: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
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
          amount: 1000,
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
      level: 2,
      traits: ["Royal Base"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-025", compiled);
