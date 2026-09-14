import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "IceClad",
          raw: "＜Ice Clad＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Trash any 2 digivolution cards from your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          amount: 2,
          scope: "acrossDigimon",
        },
        {
          effectTextPart:
            "Then, you may place 1 of their Digimon with no digivolution cards as the top or bottom security card.",
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          faceDown: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Trash any 2 digivolution cards from your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: "all",
          },
          amount: 2,
          scope: "acrossDigimon",
        },
        {
          effectTextPart:
            "Then, you may place 1 of their Digimon with no digivolution cards as the top or bottom security card.",
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          faceDown: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Ice-Snow"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
              raw: "＜Piercing＞",
            },
          },
          while: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Ice-Snow"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
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
      level: 4,
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-016", compiled);
