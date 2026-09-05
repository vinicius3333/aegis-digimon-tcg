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
          kind: "CostModifier",
          costType: "play",
          handResident: true,
          mode: "set",
          amount: 0,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "permanent",
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controller: "any",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Agumon"], match: "nameExact" }],
                },
                raw: "you have [Agumon]",
              },
              {
                kind: "youHave",
                filter: {
                  controller: "any",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Pulsemon"], match: "nameExact" }],
                },
                raw: "you have [Pulsemon]",
              },
              {
                kind: "youHave",
                filter: {
                  controller: "any",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Gammamon"], match: "nameExact" }],
                },
                raw: "you have [Gammamon]",
              },
            ],
            raw: "you have [Agumon], [Pulsemon], and [Gammamon]",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 2,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
                playCostLte: 3,
              },
              count: "all",
              to: "hand",
            },
          ],
          rest: "deckTop",
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

registerIrCard("P-116", compiled);
