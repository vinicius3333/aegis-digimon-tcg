// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tsDigimon = { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const tsTamerTrash = { controllerDefault: "mine", zone: "trash", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const opponentDigimon = { controllerDefault: "opponent", kind: ["Digimon"] };

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
      frequency: "OncePerTurn",
      actions: [{
        kind: "PlayWithoutCost",
        target: { filter: tsTamerTrash, count: 1 },
        from: ["trash"],
        payCost: true,
        reduceCostBy: 2,
        optional: true,
      }],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenAttacking",
        actions: [{
          kind: "TrashDigivolution",
          target: { filter: opponentDigimon, count: 1 },
          amount: 2,
          fromTop: false,
          optional: true,
          cost: { kind: "trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
        }],
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-021", compiled);
