// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
            },
            count: 1,
            isSelf: true,
          },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: {
            kind: "opponentHasNone",
            filter: { digivolutionCards: "hasAny", controller: "opponent", kind: ["Digimon"] },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
              nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          },
          while: {
            kind: "opponentHasNone",
            filter: { digivolutionCards: "hasAny", controller: "opponent", kind: ["Digimon"] },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
      isInherited: true,
    },
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
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          scope: "acrossDigimon",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          scope: "acrossDigimon",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
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

registerIrCard("EX8-023", compiled);
