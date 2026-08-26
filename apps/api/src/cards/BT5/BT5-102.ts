// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
