// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const jupitermon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Jupitermon"], match: "name" }] };
const recovery = [{ kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1 }, { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", source: "deck", amount: 2 }];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover", actions: recovery },
    { trigger: "Counter", frequency: "OncePerTurn", sharedUseKey: "BT26-103/trash-recover", actions: recovery },
    { trigger: "Static", actions: [{ kind: "RawUnparsed", text: "Succession (Jupitermon): gain all effects other than Succession from the topmost face-up Jupitermon digivolution card." }] },
    { trigger: "AllTurns", actions: [
      { kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: ownDigimon, oncePerTurnKey: "BT26-103/security-removed-dp", actions: [{ kind: "ModifyDP", target: { filter: opponentDigimon, count: 1 }, amount: -15000, duration: "untilOpponentTurnEnd" }] },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", sourceFilter: ownDigimon, oncePerTurnKey: "BT26-103/security-removed-dp", actions: [{ kind: "ModifyDP", target: { filter: opponentDigimon, count: 1 }, amount: -15000, duration: "untilOpponentTurnEnd" }] },
    ] },
  ],
  coverage: "partial",
  residual: ["Succession conferral of the topmost face-up Jupitermon stack card is not an executable IR action in the current interpreter; retained as loud RawUnparsed."],
  digivolutionRequirement: [{ level: 6, traits: ["Olympos XII"], cost: 5, isAlternate: true }],
};

registerIrCard("BT26-103", compiled);
