// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
const securityWipeAndDeletes = [
  { kind: "SecurityManipulation", op: "trashTop", controller: "mine", leaveCount: 0, trackCount: "trashedSecurity" },
  { kind: "RepeatPerCount", countSource: "trashedSecurity", action: { kind: "Delete", target: opponentDigimon }, raw: "For each card this effect trashed, delete 1 of your opponent's Digimon" },
  { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", source: "deck", amount: 3, raw: "＜Recovery +3＞ (Place the top 3 cards of your deck as your top security card.)" },
];

const compiled: CompiledCard = {
  keywords: [
    { keyword: "Rush", raw: "＜Rush＞" },
    { keyword: "Piercing", raw: "＜Piercing＞" },
    { keyword: "Execute", raw: "＜Execute＞" },
  ],
  effects: [
    { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "instead", sourceFilter: { isSelfRef: true }, leaveCause: "otherThanBattle", raw: "＜Decode ([Plutomon])＞: when this Digimon would leave other than in battle, you may play 1 [Plutomon] from its digivolution cards without paying the cost.", actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", zone: "digivolutionCards", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Plutomon"], match: "name" }] }, count: 1 }, fromOwnDigivolutionStack: true, payCost: false, optional: true }] }] },
    { trigger: "OnPlay", actions: securityWipeAndDeletes },
    { trigger: "WhenDigivolving", actions: securityWipeAndDeletes },
    { trigger: "OnDeletion", actions: [{ kind: "GainKeyword", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" }, keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 6, traits: ["TS"], cost: 4, isAlternate: true }],
};

registerIrCard("BT26-083", compiled);
export default compiled;
