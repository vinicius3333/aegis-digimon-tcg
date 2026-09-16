import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition ([Apollomon] & [Dianamon])＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCardsCompareToSource: "lte",
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
      trigger: "WhenAttacking",
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
          amount: 1,
          scope: "acrossDigimon",
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "EndAttack",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    },
    {
      trigger: "Counter",
      actions: [
        {
          effectTextPart:
            "[When Attacking] [Counter] [Once Per Turn] For each of this Digimon's digivolution cards, you may trash any 1 digivolution card from your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          scope: "acrossDigimon",
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "EndAttack",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "BT25-103/trash-sources-end-attack",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-103", compiled);
