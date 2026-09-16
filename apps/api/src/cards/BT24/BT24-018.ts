import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Progress",
          raw: "＜Progress＞",
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] You may trash any 1 of your opponent's security cards.",
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "security",
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart: "Then, this Digimon may unsuspend.",
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "opponent",
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Reptile", "Dragonkin"],
                  match: "trait",
                },
              ],
            },
            count: 10000,
            upTo: true,
          },
          affectsAll: true,
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                superlative: "lowestDP",
              },
              count: 1,
            },
            raw: "by deleting 1 of your opponent's lowest DP Digimon, they don't leave",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Lamiamon"],
      cost: 6,
      isAlternate: true,
      controllerControls: {
        kind: ["Tamer"],
        namesExact: ["Owen Dreadnought"],
        min: 1,
      },
    },
  ],
};

registerIrCard("BT24-018", compiled);
