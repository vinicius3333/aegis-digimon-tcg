import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Cyber Engage (BT25-098)
// <Use Req. ([Appmon] trait)>
// [Main] Reveal top 3 of your deck. Add 1 [Appmon] trait to hand, trash the rest.
//        Then place this card in the battle area.
// [Main] <Delay> You may play 1 [Appmon] trait from hand with cost reduced by 3.
// [Security] Place this card in the battle area.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [],
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            raw: "you have a card w/[Appmon] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            count: 1,
            upTo: true,
          },
          payCost: true,
          reduceCostBy: 3,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      keywords: [],
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-098", compiled);
