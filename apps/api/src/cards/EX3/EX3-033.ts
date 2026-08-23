// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] You may place 1 [Trial of the Four Great Dragons] from your hand in the battle area if you don't have one in play.",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Trial of the Four Great Dragons"],
                  match: "name",
                },
              ],
            },
            count: 1,
            zone: "hand",
            from: ["hand"],
          },
          optional: true,
          condition: {
            kind: "youHaveNone",
            filter: {
              controller: "mine",
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }],
            },
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Four Great Dragons"],
                      match: "trait",
                    },
                  ],
                },
                raw: "you have a Digimon with [Four Great Dragons] in its traits in play",
              },
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Trial of the Four Great Dragons"],
                      match: "name",
                    },
                  ],
                },
                raw: "[Trial of the Four Great Dragons] is in your battle area",
              },
            ],
            raw: "you have a Digimon with [Four Great Dragons] in its traits in play, or [Trial of the Four Great Dragons] is in your battle area",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Four Great Dragons"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Four Great Dragons"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Four Great Dragons] in its traits in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-033", compiled);
