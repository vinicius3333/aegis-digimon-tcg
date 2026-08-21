// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX9-071 Protein (Option card)
// Static: While you have a [DM] trait Digimon or Tamer on the field, ignore color requirements.
// [Main] <Draw 1>. Then, place this card in the battle area.
// [Main] <Delay>: By trashing 1 of your [DM] trait Digimon's bottom 2 face-down digivolution
//   cards, it unsuspends.
// [Security] Gain 1 memory. Then, place this card in the battle area.
// Q4833: All required face-down digivolution cards must be trashed; partial cost can't be met.
// Q4834: "while you have [card] on the field" = card in battle area or breeding area.
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
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "battleArea",
                  kind: ["Digimon", "Tamer"],
                  nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "breeding",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
                },
              },
            ],
            raw: "you have a [DM] trait Digimon or Tamer on the field",
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
      trigger: "Main",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "paidHost",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                faceDown: true,
                withinBottomN: 2,
                sameHost: true,
                hostFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["DM"],
                      match: "trait",
                    },
                  ],
                },
              },
              count: 2,
            },
            bindHostAs: "paidHost",
            raw: "By trashing 1 of your [DM] trait Digimon's bottom 2 face-down digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
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
          kind: "GainMemory",
          amount: 1,
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

registerIrCard("EX9-071", compiled);
