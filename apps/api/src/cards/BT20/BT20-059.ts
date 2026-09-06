import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
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
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          grant: "immuneToOpponentDigimonEffects",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Gankoomon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Gankoomon]/[X Antibody] is in this Digimon's digivolution cards",
          },
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
                  tokens: ["Sistermon", "Huckmon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            count: "all",
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
              nameOrTrait: [
                {
                  tokens: ["Sistermon", "Huckmon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
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
          duration: "untilOpponentTurnEnd",
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
            },
            count: "all",
          },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Jesmon GX"],
                  match: "name",
                },
              ],
            },
            raw: "while this Digimon is [Jesmon GX]",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Jesmon GX"],
                  match: "name",
                },
              ],
            },
            raw: "while this Digimon is [Jesmon GX]",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gankoomon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-059", compiled);
