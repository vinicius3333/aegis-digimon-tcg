// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const _opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const _ownDigimon = { controller: "mine", kind: ["Digimon"] };
const _glowingDawn = { controller: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] };
const recovery = [
  {
    kind: "TrashDigivolution",
    target: { filter: { controller: "mine", kind: ["Tamer"], digivolutionCards: "hasAny" }, count: 1 },
    amount: 1,
    fromTop: false,
    optional: true,
  },
  { kind: "Recover", controller: "mine", amount: 1, condition: { kind: "ifThisEffectActed" } },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "RecoverByTrashingMostSecurity", recover: false },
        {
          kind: "SelectBind",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1, bindAs: "suspendLocked" },
          condition: { kind: "ifThisEffectActed" },
        },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "suspendLocked", filter: {}, count: 1 },
          restriction: "beSuspended",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
        ...recovery,
      ],
    },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: recovery },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-031", compiled);
