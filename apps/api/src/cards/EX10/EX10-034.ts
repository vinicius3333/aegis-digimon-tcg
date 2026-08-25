// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5101: gained attack effects still exist on unaffected Digimon, but only
// trigger if that Digimon can resolve effects. Q5102 requires exactly two
// digivolution cards; Q5103 watches attacks by either player.
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
    ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack" }],
          duration: "untilOpponentTurnEnd",
        },
      ],
    })),
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
              duration: "untilOwnerTurnEnd",
              cost: {
                kind: "trash",
                target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                raw: "By trashing any 2 of this Digimon's digivolution cards",
              },
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "untilOwnerTurnEnd",
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
    { level: 5, colors: ["Black"], cost: 5 },
    { level: 5, colors: ["Purple"], cost: 5 },
  ],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }],
};

registerIrCard("EX10-034", compiled);
export default compiled;
