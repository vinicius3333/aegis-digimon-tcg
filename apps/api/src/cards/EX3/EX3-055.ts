// HAND-VERIFIED IR for EX3-055 Wormmon — preserve the official errata filters.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The shared interpreter executes this reviewed IR; removing the generated header
// keeps the compiler from overwriting the verified errata behavior.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Red", "Purple"],
                nameOrTrait: [
                  {
                    tokens: ["Free"],
                    match: "trait",
                  },
                  {
                    tokens: ["Imperialdramon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Red", "Purple"],
                nameOrTrait: [
                  {
                    tokens: ["Free"],
                    match: "trait",
                  },
                  {
                    tokens: ["Imperialdramon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              to: "trash",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
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
              keyword: "Retaliation",
              raw: "＜Retaliation＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Red"],
            },
            raw: "you have a red Digimon in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-055", compiled);
