// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-093 Big Bang Punch!
// Fix: [All Turns] effect — Link action is part of the <Delay> triggered by the suspend;
//   moved inside SubTrigger. Link target is the suspending Digimon (isTriggerSource).
//   Linked card filter is [Appmon] trait from hand (engine enforces <Link> requirement per Q5367).
//   Q5366: "on the field" includes battle area and breeding area.
export const compiled: CompiledCard = {
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
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Appmon"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon or Tamer with the [Appmon] trait on the field (includes breeding area, per Q5366)",
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Appmon"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Link",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Appmon"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              recipient: {
                filter: {
                  isTriggerSource: true,
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "When any of your [Appmon] trait Digimon suspend",
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
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-093", compiled);
