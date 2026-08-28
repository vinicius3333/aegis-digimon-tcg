// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Justimon", "Raidenmon"], match: "name" }],
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Justimon", "Raidenmon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon with [Justimon] or [Raidenmon] in its name in play",
          },
          cost: {
            kind: "payMemory",
            memory: 1,
            raw: "you may pay 1 memory",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Machine", "Cyborg"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "by trashing 1 Digimon card with [Machine] or [Cyborg] in its traits in your hand",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: 1,
            bindAs: "suspendedTarget",
          },
        },
        {
          kind: "Suspend",
          target: {
            fromSelectionRef: "suspendedTarget",
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "suspendedTarget",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-054", compiled);
