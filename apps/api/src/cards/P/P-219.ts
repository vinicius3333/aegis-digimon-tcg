import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "reduce",
          amount: 3,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          handResident: true,
          duration: "permanent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "if your opponent has 10 or more cards in their trash",
          },
        },
      ],
    },
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
        },
        {
          effectTextPart:
            "Then, by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon, you may play 1 [Creepymon] from your trash without paying the cost. The Digimon this effect played gains ＜Rush＞ and ＜Blocker＞ until your opponent's turn ends.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Creepymon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Evil", "Fallen Angel"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon, you may play 1 [Creepymon] from your trash without paying the cost. The Digimon this effect played gains ＜Rush＞ and ＜Blocker＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, by deleting 1 of your [Evil] or [Fallen Angel] trait Digimon, you may play 1 [Creepymon] from your trash without paying the cost. The Digimon this effect played gains ＜Rush＞ and ＜Blocker＞ until your opponent's turn ends.",
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "mine",
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

registerIrCard("P-219", compiled);
