import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine" }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, raw: "reduce the cost by 2", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }] }, raw: "you have a Digimon with [X Antibody] in its digivolution cards in play" } }] }] },
    { trigger: "Main", actions: [{ kind: "RawUnparsed", text: "missing-primitive(unaudited): Choose any number of your opponent's Digimon and Tamers whose combined play costs are less than or equal to the play cost of 1 of your Digimon with [Greymon] in its name, and delete all of the chosen cards" }, { kind: "Attack", target: { filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] }, count: 1 }, optional: true, attackPlayer: true }] },
    { trigger: "Security", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" }, count: 1 } }], isSecurity: true },
  ],
  coverage: "partial",
  residual: ["missing-primitive(unaudited): Choose any number of your opponent's Digimon and Tamers whose combined play costs are less than or equal to the play cost of 1 of your Digimon with [Greymon] in its name, and delete all of the chosen cards"],
};

registerIrCard("BT11-107", compiled);
