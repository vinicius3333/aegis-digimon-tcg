import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Both grant clauses print "until the end of your opponent's turn"
// (`untilOpponentTurnEnd`), matching the rest of the Device cycle (BT19-093,
// BT19-098, P-159). KB Q3170 confirms it for the trashed clause: trashed during
// the opponent's turn, the grant lasts to the end of THAT turn.
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
                  tokens: ["Knight Device"],
                  match: "nameExact",
                },
              ],
            },
            raw: "you don't have [Knight Device]",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 4000,
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
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "whenTrashedFromBattleArea",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 4000,
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
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
          },
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

registerIrCard("BT19-095", compiled);
