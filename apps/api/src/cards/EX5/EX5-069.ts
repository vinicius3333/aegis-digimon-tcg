// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q&A rulings (binding):
// Q3674: "this effect trashed a card with [Seven Great Demon Lords]" = card trashed from hand.
// Q3675: <Delay> is optional — player can choose not to trash to prevent activation.
// Q3676: Does NOT activate when opponent's Digimon played into breeding area.
// Q3677: Does NOT activate when a Tamer is played as a Digimon (Marcus Damon case).
// Q3678: DOES activate when one of MY effects plays an opponent's Digimon.
// The sourceFilter: controller:"opponent" is correct (the CARD played is opponent's).
// Zone filter excludes breeding area play. byEffect:true restricts to effect-driven plays
// (KB Q3665/Q6034 pattern; text says "When an EFFECT plays an opponent's Digimon"), which
// as a side effect also covers Q3677 (a Tamer played-as-Digimon by an effect still sets
// TriggerInfo.playedByEffect via the same play seam, so the byEffect gate does not
// distinguish that case — but Q3677's actual exclusion is that Marcus Damon is played AS A
// TAMER, not as a Digimon, so the `kind:["Digimon"]` sourceFilter already excludes it).
//
// The [All Turns] SubTrigger arms <Delay> (GainKeyword) when the watcher fires; the
// separate [Main]+<Delay> clause below is the "by trashing it the next turn or later,
// activate the effect below" activation — the interpreter's universal Delay-armed wrapper
// (requiresDelayArmed on the PlayWithoutCost) gates on the armed grant, is optional
// (declines without trashing per Q3675), can't fire the turn the card enters, and trashes
// the source as the cost before running the payload.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
              bindAs: "trashedCard",
            },
            raw: "By trashing 1 card in your hand",
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
          condition: {
            kind: "lastTrashedMatchesFilter",
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
            },
            raw: "the card trashed from your hand has the [Seven Great Demon Lords] trait",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          raw: "When an effect plays an opponent's Digimon, this Digimon gains ＜Delay＞.",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            zone: "battleArea",
            byEffect: true,
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
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      actions: [
        {
          kind: "PlayWithoutCost",
          requiresDelayArmed: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Leviamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
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

registerIrCard("EX5-069", compiled);
