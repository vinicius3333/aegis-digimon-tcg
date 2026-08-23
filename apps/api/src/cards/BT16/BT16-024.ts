// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          filter: {
            zone: "security",
            controllerDefault: "mine",
          },
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          count: "all",
          searchZone: "security",
          purpose: "digivolveAmongRevealed",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          payCost: true,
          reduceCost: 2,
          optional: true,
          from: ["security"],
          amongPreviousSearch: true,
          bindResultAs: "digivolvedByThisEffect",
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              zone: "hand",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          condition: {
            kind: "bindingExists",
            ref: "digivolvedByThisEffect",
            raw: "this effect digivolved",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          filter: {
            zone: "security",
            controllerDefault: "mine",
          },
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          count: "all",
          searchZone: "security",
          purpose: "digivolveAmongRevealed",
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          payCost: true,
          reduceCost: 2,
          optional: true,
          from: ["security"],
          amongPreviousSearch: true,
          bindResultAs: "digivolvedByThisEffect",
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              zone: "hand",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          condition: {
            kind: "bindingExists",
            ref: "digivolvedByThisEffect",
            raw: "this effect digivolved",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Three Great Angels"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Angemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-024", compiled);
export { compiled };
