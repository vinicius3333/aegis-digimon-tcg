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
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: ["battleArea", "breeding"],
              nameOrTrait: [
                {
                  tokens: ["BEATBREAK"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a card w/[BEATBREAK] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] You may play 1 [BEATBREAK] trait card with a play cost of 4 or less from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 4,
              nameOrTrait: [
                {
                  tokens: ["BEATBREAK"],
                  match: "trait",
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
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            targetIsPermanent: true,
            host: "target",
            position: "bottom",
            faceDown: true,
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
              from: ["battleArea"],
            },
            raw: "By placing this card from the battle area face down under any of your [BEATBREAK] trait Tamers",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["BEATBREAK"],
                  match: "trait",
                },
              ],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
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

registerIrCard("ST23-15", compiled);
