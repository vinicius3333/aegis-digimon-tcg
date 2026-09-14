import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
//
// Note: the corresponding "P-159" entry in packages/shared/src/effects/effects.json is
// preserving this card's [All Turns] SubTrigger clause and its Static/Main GainKeyword grants —
// or it will regress this file back to that incomplete state.
//
// Renamed "whenEffectTrashes" (declared in SubTriggerEventName, never fired anywhere) to the
// already-live "whenTrashedByEffect" — its isSelfRef sourceFilter matches that event's
// self-anchor semantics exactly (cards.json effectText: "When an effect trashes this card...").
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
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Rook Device"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you don't have [Rook Device]",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedByEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "Reboot",
                raw: "＜Reboot＞",
              },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              keyword: {
                keyword: "Blocker",
                raw: "＜Blocker＞",
              },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              amount: 2000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] 1 of your Digimon gains ＜Reboot＞ , ＜Blocker＞and gets +2000 DP until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "[Main] 1 of your Digimon gains ＜Reboot＞ , ＜Blocker＞and gets +2000 DP until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "[Main] 1 of your Digimon gains ＜Reboot＞ , ＜Blocker＞and gets +2000 DP until the end of your opponent's turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          amount: 2000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart: "[Security] ＜De-Digivolve2＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-159", compiled);
