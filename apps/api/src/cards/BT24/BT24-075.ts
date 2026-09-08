import type { Action, CompiledCard, Cost, CostGatedBlockAction, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashOneCard: Cost = {
  kind: "trash",
  target: { filter: { zone: "hand" as const, controller: "mine" as const }, count: 1 },
  raw: "By trashing 1 card in your hand",
};

const deleteByLevel = (level: number): Action => {
  const filter: Filter = { controller: "opponent", kind: ["Digimon"], levels: [level] };
  return { kind: "Delete", target: { filter, count: 1 } };
};

const deleteTargets: CostGatedBlockAction = {
  kind: "CostGatedBlock",
  cost: trashOneCard,
  optional: true,
  abortOnDecline: true,
  actions: [deleteByLevel(3), deleteByLevel(4)],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [deleteTargets],
    },
    {
      trigger: "WhenDigivolving",
      actions: [deleteTargets],
    },
    {
      trigger: "YourTurn",
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
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasName", names: ["Titamon"] },
              {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
              },
            ],
            raw: "this Digimon is [Titamon] or has the [Titan] trait",
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
      traits: ["Demon", "TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-075", compiled);
