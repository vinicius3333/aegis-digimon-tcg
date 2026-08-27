// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const jupitermon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Jupitermon"], match: "name" }] };
const recovery = [
  { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1 },
  { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", source: "deck", amount: 2 },
];

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Piercing", raw: "＜Piercing＞" },
    { keyword: "Reboot", raw: "＜Reboot＞" },
    { keyword: "Blocker", raw: "＜Blocker＞" },
    { keyword: "Succession", raw: "＜Succession ([Jupitermon])＞" },
  ],
  effects: [
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover", actions: recovery },
    { trigger: "Counter", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover", actions: recovery },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "effects",
          filter: jupitermon,
          topmostOnly: true,
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          oncePerTurnKey: "BT26-103/security-removed-dp",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: opponentDigimon, count: 1 },
              amount: -15000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          sourceFilter: { controller: "any" },
          oncePerTurnKey: "BT26-103/security-removed-dp",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: opponentDigimon, count: 1 },
              amount: -15000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 6, traits: ["Olympos XII"], cost: 5, isAlternate: true }],
};

registerIrCard("BT26-103", compiled);
