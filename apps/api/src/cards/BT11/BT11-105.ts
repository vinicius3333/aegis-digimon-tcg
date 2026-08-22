import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine" }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 1, raw: "reduce the cost by 1", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", nameOrTrait: [{ tokens: ["Snatchmon"], match: "name" }] }, raw: "you have a [Snatchmon] in play" } }] }] },
    { trigger: "Main", actions: [{ kind: "Digivolve", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, into: "[Destromon] or [Galacticmon]", from: "trash", freeCost: false, cost: { kind: "place", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Vemmon", "Destromon"], match: "name" }] }, count: 1, from: ["trash"] }, raw: "By placing 1 [Vemmon] or [Destromon] from your trash under 1 of your Digimon as its bottom digivolution card", underFilter: { controller: "mine", kind: ["Digimon"] } }, optional: true, abortOnDecline: true }] },
    { trigger: "Security", actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] }, count: 1, to: "play" }], rest: "trash", optional: true }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-105", compiled);
