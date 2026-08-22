// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: Play 1 each of WarGrowlmon Token, Taomon Token, Rapidmon Token (3 tokens total).
// Cannot play tokens whose names match Digimon you already have (pre-check condition).
// Then 1 of your level 5 Digimon gains <Alliance> TWICE (count:2) for the turn and MUST
// attack (KB Q3163: the Digimon must attack if possible, so mandatory Attack action follows).
// Q3162: tokens played by this effect don't have a level and can't be chosen for the "then" part.
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
              levels: [5],
              nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "name" }],
            },
            raw: "you have a level 5 [WarGrowlmon]/[Taomon]/[Rapidmon]",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["WarGrowlmon"],
          count: 1,
          payCost: false,
          condition: {
            kind: "not",
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "nameExact" }],
              },
            },
            raw: "can't play tokens with the same names as your Digimon",
          },
        },
        {
          kind: "PlayToken",
          tokens: ["Taomon"],
          count: 1,
          payCost: false,
          condition: {
            kind: "not",
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Taomon"], match: "nameExact" }],
              },
            },
            raw: "can't play tokens with the same names as your Digimon",
          },
        },
        {
          kind: "PlayToken",
          tokens: ["Rapidmon"],
          count: 1,
          payCost: false,
          condition: {
            kind: "not",
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Rapidmon"], match: "nameExact" }],
              },
            },
            raw: "can't play tokens with the same names as your Digimon",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [5],
              excludeToken: true,
            },
            count: 1,
          },
          keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
          count: 2,
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [5],
              excludeToken: true,
            },
            count: 1,
          },
          mandatory: true,
          sameTarget: true,
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
              levels: [5],
              nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand"],
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

registerIrCard("BT19-091", compiled);
