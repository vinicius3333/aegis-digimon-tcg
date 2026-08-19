// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-099 (The Sistermon Sisters Training Gym).
// Static: while you have a Digimon with [Huckmon] in its name on the field (including
// breeding area per KB Q5387), ignore this card's color requirements.
// [Main] <Draw 1> then place this card in the battle area.
// [Your Turn] When any of your Digimon digivolve into a Digimon with [Huckmon] or
// [Jesmon] in its name, this card gains <Delay>. The delay payload: play 1 [Sistermon]
// card from hand or trash without cost.
// [Security] play 1 [Sistermon] from hand or trash without cost; you may place this
// card in the battle area.
export const compiled: CompiledCard = {
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
              // KB Q5387: "on the field" = battle area OR breeding area
              kind: ["Digimon"],
              zone: ["battleArea", "breedingArea"],
              nameOrTrait: [{ tokens: ["Huckmon"], match: "name" }],
            },
            raw: "you have a Digimon with [Huckmon] in its name on the field (battle area or breeding area)",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      // SubTrigger: when your Huckmon/Jesmon digivolves, this card gains <Delay>.
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          // sourceFilter applies to the Digimon being digivolved into
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Huckmon", "Jesmon"], match: "name" }],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
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
          raw: "When any of your Digimon digivolve into a Digimon with [Huckmon] or [Jesmon] in its name, this card gains ＜Delay＞",
        },
      ],
    },
    {
      // <Delay> payload: can be activated (trashing this card) on a subsequent turn.
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
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
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-099", compiled);
