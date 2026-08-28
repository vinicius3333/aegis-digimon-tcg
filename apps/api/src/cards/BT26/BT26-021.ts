// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tsDigimon = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const tsTamerTrash = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Tamer"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
};
const opponentDigimon = { controllerDefault: "opponent", kind: ["Digimon"] };
const inheritedAttack = {
  kind: "TrashDigivolution",
  target: { filter: opponentDigimon, count: 1 },
  amount: 2,
  fromTop: false,
};
const inheritedCost = { kind: "trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } };

const lockAttackTarget = {
  kind: "Restrict",
  target: { filter: tsDigimon, count: 1 },
  restriction: "attackTargetChange",
  duration: "untilEachTurnEnd",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [lockAttackTarget] },
    { trigger: "WhenDigivolving", actions: [lockAttackTarget] },
    {
      trigger: "Main",
      effectKey: "BT26-021/main-play-ts-tamer-from-trash",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: tsTamerTrash, count: 1 },
          from: ["trash"],
          payCost: true,
          reduceCostBy: 2,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttacking", cost: inheritedCost, actions: [inheritedAttack] }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-021", compiled);
