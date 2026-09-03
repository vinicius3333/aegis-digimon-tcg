import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Morphomon", "Eosmon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 [Morphomon]/[Eosmon] in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            {
              tokens: ["Eosmon"],
              match: "name",
            },
          ],
        },
        raw: "you have [Eosmon]",
      },
      actions: [
        {
          kind: "DisableTimingEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
          timings: ["onPlay"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Eosmon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    excludeLeavingSubject: true,
                    nameOrTrait: [
                      {
                        tokens: ["Eosmon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                },
                raw: "by deleting 1 of your other [Eosmon]",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-092", compiled);
