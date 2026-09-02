import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q6886: the part after "after" is conditional on paying the "by trashing"
// cost. The Delay digivolution pays no cost, but it does not ignore printed
// digivolution requirements because the card never says to ignore them.
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
              // CR 16-42-3: ＜Use Req.＞ lets a player ignore the color requirements with the
              // specified DIGIMON AND/OR TAMERS on the field. Without this kind gate the
              // youHave count also accepted a matching OPTION permanent — reachable in EX12,
              // where Options such as this one are PLACED IN THE BATTLE AREA and keep their
              // traits, so one resident Option wrongly satisfied the next one's Use Req.
              kind: ["Digimon", "Tamer"],
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
            },
            raw: "you have a card w/[SW] trait",
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
                nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
              },
              count: 1,
            },
            raw: "By trashing 1 [SW] trait card from your hand",
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
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Saneiketsu"], match: "trait" }],
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

registerIrCard("EX12-071", compiled);
