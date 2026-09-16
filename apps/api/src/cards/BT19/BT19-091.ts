import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "nameExact" }],
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
          effectTextPart:
            "[Main] Play 1 [WarGrowlmon] Token (Digimon/Red/6000 DP), [Taomon] Token (Digimon/Yellow/6000 DP), and 1 [Rapidmon] Token (Digimon/Green/6000 DP). This effect can't play tokens with the same names as your Digimon.",
          kind: "PlayToken",
          tokens: ["WarGrowlmon Token"],
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
          effectTextPart:
            "[Main] Play 1 [WarGrowlmon] Token (Digimon/Red/6000 DP), [Taomon] Token (Digimon/Yellow/6000 DP), and 1 [Rapidmon] Token (Digimon/Green/6000 DP). This effect can't play tokens with the same names as your Digimon.",
          kind: "PlayToken",
          tokens: ["Taomon Token"],
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
          effectTextPart:
            "[Main] Play 1 [WarGrowlmon] Token (Digimon/Red/6000 DP), [Taomon] Token (Digimon/Yellow/6000 DP), and 1 [Rapidmon] Token (Digimon/Green/6000 DP). This effect can't play tokens with the same names as your Digimon.",
          kind: "PlayToken",
          tokens: ["Rapidmon Token"],
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
          effectTextPart: "Then, 1 of your level 5 Digimon gains ＜Alliance＞ twice for the turn and attacks.",
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
              nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "nameExact" }],
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
