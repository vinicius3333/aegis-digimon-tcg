import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine" }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 1, raw: "reduce the cost by 1", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"] }, raw: "you have a green Tamer in play" } }] }] },
    { trigger: "Main", actions: [
      { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "chosenDigimon" } },
      { kind: "ModifyDP", target: { filter: {}, count: 1, fromSelectionRef: "chosenDigimon" }, amount: 5000, duration: "forTheTurn", alsoGainKeywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
      { kind: "Attack", target: { filter: {}, count: 1, fromSelectionRef: "chosenDigimon" }, optional: true },
    ] },
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-104", compiled);
