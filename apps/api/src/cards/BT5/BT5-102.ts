import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            upTo: true,
          },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart: "Then, if you have a Digimon with ＜Digi-Burst＞ in play, gain 2 memory.",
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Digi-Burst"], match: "text" }],
            },
            raw: "you have a Digimon with ＜Digi-Burst＞ in play",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            upTo: true,
          },
          restriction: "attack",
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, if you have a Digimon with <Digi-Burst> in play, gain 2 memory.",
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Digi-Burst"], match: "text" }],
            },
            raw: "you have a Digimon with ＜Digi-Burst＞ in play",
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-102", compiled);
