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
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            targetIsPermanent: true,
            host: "target",
            position: "bottom",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By placing this Digimon under 1 of your other Digimon that's red or has [Legend-Arms] in its traits as its bottom digivolution card",
            underFilter: {
              or: [
                {
                  colors: ["Red"],
                },
                {
                  nameOrTrait: [
                    {
                      tokens: ["Legend-Arms"],
                      match: "trait",
                    },
                  ],
                },
              ],
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
          },
          optional: true,
          abortOnDecline: true,
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
            kind: "youHave",
            filter: {
              or: [
                {
                  colors: ["Red"],
                },
                {
                  nameOrTrait: [
                    {
                      tokens: ["Legend-Arms"],
                      match: "trait",
                    },
                  ],
                },
              ],
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you have a Digimon that's red or has [Legend-Arms] in its traits in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST13-11", compiled);
