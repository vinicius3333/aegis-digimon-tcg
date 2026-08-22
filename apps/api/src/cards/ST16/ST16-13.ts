// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ] },
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{
      kind: "SubTrigger", event: "whenTrashedFromHand",
      actions: [{ kind: "PlayWithoutCost", target: { filter: {
        controller: "mine", kind: ["Digimon"], colors: ["Purple"],
        levelComparison: { op: "lte", value: 4 },
      }, count: 1 }, from: ["trash"], payCost: false, optional: true,
      condition: { kind: "triggerByYourEffect" } }],
      raw: "when one of your effects trashes a card in your hand, you may play 1 level 4 or lower purple Digimon card from your trash without paying the cost",
    }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST16-13", compiled);
export { compiled };
