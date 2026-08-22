// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q6883: the Draw 2 and placement tail cannot resolve unless the [TB] hand card is trashed.
// Q6884-Q6885: the Delay trigger and other simultaneous effects are ordered by the player;
// the replacement keeps the intrinsic Delay cost and payload in one effect window.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
            },
            raw: "you have a card w/[TB] trait",
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
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
              },
              count: 1,
            },
            raw: "By trashing 1 [TB] trait card from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "gte", value: 5 },
            nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Sanmyojin"], match: "trait" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX12-070", compiled);
