// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const protectedTarget = { filter: ownDigimon, count: 1, bindAs: "protectedDigimon" };
const protection = [
  { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1, trackCount: "trashedSecurity" },
  { kind: "SelectBind", target: protectedTarget, condition: { kind: "namedCountAtLeast", countSource: "trashedSecurity", count: 1 } },
  { kind: "Restrict", target: { filter: { boundRef: "protectedDigimon" }, count: 1 }, restriction: "dpImmune", duration: "untilOpponentTurnEnd", byOpponentEffectsOnly: true, condition: { kind: "namedCountAtLeast", countSource: "trashedSecurity", count: 1 } },
  { kind: "StackTrashLock", target: { filter: { boundRef: "protectedDigimon" }, count: 1 }, duration: "untilOpponentTurnEnd", condition: { kind: "namedCountAtLeast", countSource: "trashedSecurity", count: 1 } },
];

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Decode", raw: "＜Decode ([Aegiomon])＞" }, { keyword: "Ascension", raw: "＜Ascension＞" }],
  effects: [
    { trigger: "OnPlay", actions: protection },
    { trigger: "WhenDigivolving", actions: protection },
    { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "instead", sourceFilter: { isSelfRef: true }, leaveCause: "otherThanBattle", raw: "＜Decode ([Aegiomon])＞: when this Digimon would leave other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.", actions: [{ kind: "PlayWithoutCost", target: { filter: { controller: "mine", zone: "digivolutionCards", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Aegiomon"], match: "name" }] }, count: 1 }, fromOwnDigivolutionStack: true, payCost: false, optional: true }] }] },
    { trigger: "Static", actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "trait", tokens: ["Angel"], duration: "permanent" }] },
    { trigger: "AllTurns", actions: [
      { kind: "SubTrigger", event: "whenSecurityRemoved", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }, oncePerTurnKey: "BT26-029/security-removed-dp", actions: [{ kind: "ModifyDP", target: { filter: opponentDigimon, count: 3 }, amount: -5000, duration: "forTheTurn" }], raw: "When your security stack is removed, 3 opponent Digimon get -5000 DP for the turn." },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }, oncePerTurnKey: "BT26-029/security-removed-dp", actions: [{ kind: "ModifyDP", target: { filter: opponentDigimon, count: 3 }, amount: -5000, duration: "forTheTurn" }], raw: "When your security stack is removed by an effect, 3 opponent Digimon get -5000 DP for the turn." },
    ] },
    { trigger: "AllTurns", isInherited: true, actions: [
      { kind: "SubTrigger", event: "whenSecurityRemoved", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }, oncePerTurnKey: "BT26-029/inherited-dedigivolve", actions: [{ kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 }], raw: "When your security stack is removed, De-Digivolve 1 an opponent Digimon." },
      { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }, oncePerTurnKey: "BT26-029/inherited-dedigivolve", actions: [{ kind: "DeDigivolve", target: { filter: opponentDigimon, count: 1 }, amount: 1 }], raw: "When your security stack is removed by an effect, De-Digivolve 1 an opponent Digimon." },
    ] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, names: ["Aegiomon"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-029", compiled);
