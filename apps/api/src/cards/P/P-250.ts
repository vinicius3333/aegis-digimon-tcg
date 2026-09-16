import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const demonShamanUndead = [{ tokens: ["Demon", "Shaman", "Undead"], match: "trait" as const }];

const handTrashCost = {
  kind: "trash" as const,
  target: {
    filter: { zone: "hand" as const, controller: "mine" as const },
    count: 1,
  },
  raw: "By trashing 1 card in your hand",
};

const grantBlockerAndRetaliation = [
  {
    kind: "GainKeyword" as const,
    target: {
      filter: { controller: "mine" as const, kind: ["Digimon" as const], nameOrTrait: demonShamanUndead },
      count: 1,
    },
    keyword: { keyword: "Blocker" as const, raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd" as const,
    cost: handTrashCost,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "GainKeyword" as const,
    target: {
      filter: { controller: "mine" as const, kind: ["Digimon" as const], nameOrTrait: demonShamanUndead },
      count: 1,
      sameTarget: true,
    },
    keyword: { keyword: "Retaliation" as const, raw: "＜Retaliation＞" },
    duration: "untilOpponentTurnEnd" as const,
  },
];

export const compiled: CompiledCard = {
  cardId: "P-250",
  effects: [
    {
      effectKey: "P-250/trash-digivolve",
      trigger: "EndOfYourTurn",
      isFromTrash: true,
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Demon"], match: "trait" }],
            },
            count: 1,
          },
          into: {
            controller: "mine",
            zone: "trash",
            isSelfRef: true,
            kind: ["Digimon"],
          },
          from: ["trash"],
          payCost: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 5,
            raw: "you have 5 or fewer cards in hand",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: grantBlockerAndRetaliation,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      effectKey: "P-250/inherited-on-deletion",
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 6,
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Ogremon", "Fugamon", "Hyogamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-250", compiled);
