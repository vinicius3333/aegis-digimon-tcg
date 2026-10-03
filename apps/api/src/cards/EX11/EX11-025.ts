import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "[Start of Your Main Phase] Add your top face-down security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
          faceDownOnly: true,
        },
        {
          effectTextPart:
            "Then, you may place 1 [Royal Base] trait Digimon card from your hand face up as the bottom security card.",
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
