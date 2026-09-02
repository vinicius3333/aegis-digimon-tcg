import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "When this card is trashed from the deck" uses SubTrigger event "whenTrashedFromDeck"
// which is a new capability (see LANE_H.md).
// [Main] effect: trash top 2 then place self in battle area.
// [Start of Your Turn] <Delay>: the keyword lives on the trigger itself (`keywords`),
// which is what wires up the interpreter's intrinsic §16-17 trash-cost + turn-guard
// (withIntrinsicDelayGate / effectsForTiming's discrete-window branch) — a plain
// GainKeyword(Delay) action here would fire the payload every turn for free with no
// cost and never be consumed, since nothing ever checks for a "requiresDelayArmed"
// action (unlike P-243/EX5-069, which genuinely gain Delay from a separate clause).
// if you don't have a Digimon, the Delay sub-effect triggers (play 1 [Impmon] from trash).
// KB Q6244: only activates when DIRECTLY trashed from deck, not via reveal/search.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceInBattleAreaSelf",
            },
          ],
          optional: true,
          raw: "when this card is trashed from the deck, you may place this card in the battle area",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Impmon"],
                  match: "name",
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
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      condition: {
        kind: "youHaveNone",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
        },
        raw: "you don't have a Digimon",
      },
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

registerIrCard("BT19-097", compiled);
