// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-237 Unique Emblem: Machina's Ascension
// <Use Req. ([Maquinamon] in text)>
// [Main] You may play 1 [Maquinamon] or [Unchained] from hand or trash without cost.
//   Then, place this card in the battle area.
// [All Turns] When any of your [Unchained] are played, <Delay>
//   · 1 of your Digimon may digivolve into a Lv6 or lower Digimon card with
//     [Maquinamon] in its text in the hand without paying the cost.
// [Security] Activate this card's [Main] effect.
//
// KB Q6523: the AllTurns trigger fires when Unchained is played via inherited effect.
// KB Q6524: "[Maquinamon] in its text" = name/traits/effects/inherited/digivolve-reqs etc.
// "[Maquinamon] or [Unchained]" in the [Main] effect uses exact name (no "in text" qualifier).
// PlaceInBattleAreaSelf is mandatory (not optional) — "Then, place this card".
// <Delay> pattern: SubTrigger grants Delay; separate Main+[Delay] trigger holds the payload.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "text" }] },
            raw: "you have a card w/[Maquinamon] in text",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Maquinamon"],
                  match: "nameExact",
                },
                {
                  tokens: ["Unchained"],
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
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Unchained"],
                match: "nameExact",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "Delay",
                raw: "＜Delay＞",
              },
              duration: "permanent",
            },
          ],
          raw: "When any of your [Unchained] are played, grant this card <Delay>",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Maquinamon"],
                match: "text",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-237", compiled);
