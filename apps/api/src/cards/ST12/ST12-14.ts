import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] 1 of your Digimon gets +2000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if you have a Digimon with [Huckmon] in its name or [Royal Knight] in its traits in play, gain 1 memory, and 1 of your Digimon gains ＜Piercing＞ for the turn. (When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would.)",
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Huckmon"], match: "name" },
                { tokens: ["Royal Knight"], match: "trait" },
              ],
            },
            raw: "you have a Digimon with [Huckmon] in its name or [Royal Knight] in its traits in play",
          },
        },
        {
          effectTextPart:
            "Then, if you have a Digimon with [Huckmon] in its name or [Royal Knight] in its traits in play, gain 1 memory, and 1 of your Digimon gains ＜Piercing＞ for the turn. (When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would.)",
          kind: "GainKeyword",
          target: {
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
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Huckmon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Huckmon] in its name or [Royal Knight] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
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

registerIrCard("ST12-14", compiled);
