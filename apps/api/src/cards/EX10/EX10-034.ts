import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
          duration: "untilOpponentTurnEnd",
          raw: 'Until your opponent\'s turn ends, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."',
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
          duration: "untilOpponentTurnEnd",
          raw: 'Until your opponent\'s turn ends, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."',
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
              duration: "untilYourTurnEnd",
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilYourTurnEnd",
              condition: { kind: "ifThisEffectActed", raw: "if you did" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, colors: ["Black"], cost: 5, isAlternate: false },
    { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
  ],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, maxMaterials: 2 }],
};

registerIrCard("EX10-034", compiled);
export { compiled };
export default compiled;
