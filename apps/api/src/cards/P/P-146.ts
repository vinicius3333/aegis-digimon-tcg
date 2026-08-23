// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeColors: ["White"],
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Reload Plug-In Q"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                  from: ["security", "digivolutionCards"],
                },
                raw: "by placing 1 [Reload Plug-In Q] from this Digimon's digivolution cards at the bottom of your security stack",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Recharge Plug-In Q"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  from: ["security", "digivolutionCards"],
                },
                raw: "by placing 1 [Recharge Plug-In Q] from this Digimon's digivolution cards at the bottom of your security stack",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-146", compiled);
