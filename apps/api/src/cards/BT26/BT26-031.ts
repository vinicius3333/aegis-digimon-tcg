// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const glowingDawn = { controller: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] };
const recovery = [
  {
    kind: "CostGatedBlock",
    cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    optional: true,
    abortOnDecline: true,
    actions: [{ kind: "Recover", controller: "mine", amount: 1 }],
  },
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
          restriction: "suspend",
          blocksCombatSuspend: true,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-031/tamer-trash-recovery",
      actions: recovery,
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-031/tamer-trash-recovery",
      actions: recovery,
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: glowingDawn },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: { filter: opponentDigimon, count: 1, bindAs: "murashigureTarget" },
        },
        {
          kind: "ModifyDP",
          target: { fromSelectionRef: "murashigureTarget" },
          amount: -8000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "CostGatedBlock",
          cost: { kind: "trashSecurityTop", controller: "mine" },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { fromSelectionRef: "murashigureTarget" },
              amount: -5000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-031", compiled);
