import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] You may play 1 [Aquilamon] or [Gatomon] from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Aquilamon", "Gatomon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, 2 of your Digimon may DNA digivolve into a Digimon card in your hand. The Digimon this effect DNA digivolved may gain <Security A. +1> for the turn and attack a player.",
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          payCost: true,
          optional: true,
          bindResultAs: "bt16091DnaResult",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              boundRef: "bt16091DnaResult",
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, 2 of your Digimon may DNA digivolve into a Digimon card in your hand. The Digimon this effect DNA digivolved may gain <Security A. +1> for the turn and attack a player.",
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              boundRef: "bt16091DnaResult",
            },
            count: 1,
          },
          attackPlayer: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "only after choosing Security Attack +1",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 [Hawkmon] or [Salamon] from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hawkmon", "Salamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-091", compiled);
export { compiled };
