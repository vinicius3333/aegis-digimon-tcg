import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
            },
            count: "all",
            except: {
              filter: {
                kind: ["Digimon"],
              },
              count: 1,
              selector: "any",
            },
          },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Omnimon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Omnimon]/[X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
            },
            count: "all",
            except: {
              filter: {
                kind: ["Digimon"],
              },
              count: 1,
              selector: "any",
            },
          },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Omnimon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Omnimon]/[X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
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
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Omnimon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-102", compiled);
