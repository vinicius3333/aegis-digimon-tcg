// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q5157-Q5160/Q5168: the two-card source cost is all-or-nothing; a granted
// End-of-Your-Turn effect belongs to its recipient; and opponent deletion from
// this card's own effect is still a valid trigger.
const playCost = {
  kind: "trash",
  target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
  raw: "By trashing any 2 of this Digimon's digivolution cards",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{
        kind: "GainTriggeredEffect",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        gainedTrigger: "EndOfYourTurn",
        gainedActions: [{ kind: "Delete", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }],
        duration: "untilOpponentTurnEnd",
      }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [{
        kind: "GainTriggeredEffect",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        gainedTrigger: "EndOfYourTurn",
        gainedActions: [{ kind: "Delete", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }],
        duration: "untilOpponentTurnEnd",
      }],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelComparison: { op: "lte", value: 4 } }, count: 1 }, from: ["trash"], payCost: false, optional: true, cost: playCost }],
        },
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levelComparison: { op: "lte", value: 4 } }, count: 1 }, from: ["trash"], payCost: false, optional: true, cost: playCost }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, colors: ["Purple"], cost: 3 }],
  digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }],
};

registerIrCard("EX10-058", compiled);
export default compiled;
