import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "nameForDigiXros",
          tokens: ["Dorulumon"],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Xros Heart", "Blue Flare"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          destination: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] },
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
      traits: ["Xros Heart"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-038", compiled);
