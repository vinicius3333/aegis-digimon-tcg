// @ts-nocheck
// HAND-FIXED IR for BT17-097 (Return to the Primogenitor) — do not regenerate over this file.
// The declarative effect record attached the ＜Delay＞ keyword to BOTH the [Main] play-body effect AND the
// [All Turns] Replacement effect, but the printed text only carries ＜Delay＞ on the [All
// Turns] clause ("When one of your Digimon ... would be deleted ..., ＜Delay＞."). Because
// `timingForTrigger` routes a Delay-keyworded "Main" effect to OnDeclaration (the delayed
// activatable window) instead of OnUseOption (the option's own play resolution — see
// interpreter.ts:6853-6862), the mistagged Main clause never ran on play: the Digivolve +
// PlaceInBattleAreaSelf actions were unreachable. Removed the erroneous keywords from Main;
// AllTurns keeps its (correct) Delay tag.
//
// The AllTurns Replacement also mistakenly carried `requiresDelayArmed: true`, which opts into
// the separate GainKeyword-armed model (P-243/EX5-069: a distinct clause grants ＜Delay＞ via
// `GainKeyword`, consumed later). This card's ＜Delay＞ is printed directly on the AllTurns
// clause itself (KB Q2886/Q2890/Q2891 confirm it as this card's own effect, no external grant),
// so it belongs to `withIntrinsicDelayGate`'s intrinsic model instead — the printed keyword's
// own trash-cost + turn-guard (comprehensive rules §16-17), which `keywords: [Delay]` on this
// trigger already activates. Left as `requiresDelayArmed`, the gate awaited a grant nothing ever
// makes, so the ＜Delay＞ could never be used. Removed the flag.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
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
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          reduceCost: 4,
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
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  useTriggerSource: true,
                  zone: "battleArea",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Imperialdramon"],
                    match: "name",
                  },
                ],
              },
              from: ["hand"],
              payCost: false,
              bindResultAs: "digivolvedToPreventDeletion",
            },
            {
              kind: "Prevent",
              condition: {
                kind: "bindingExists",
                ref: "digivolvedToPreventDeletion",
                raw: "digivolved that Digimon into [Imperialdramon]",
              },
            },
          ],
          raw: "wouldBeDeleted",
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
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Davis Motomiya", "Ken Ichijoji"],
                  match: "name",
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
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-097", compiled);
