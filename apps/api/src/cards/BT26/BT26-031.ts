// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const glowingDawn = { controller: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] };
const recovery = [
  { kind: "Trash", target: { filter: { controller: "mine", zone: "underTamers", position: "bottom", faceDown: true }, count: 1 }, trackCount: "trashedTamerCard", optional: true },
  { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", source: "deck", amount: 1, condition: { kind: "ifThisEffectActed" } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: glowingDawn } }] },
    { trigger: "WhenDigivolving", actions: [
      { kind: "RecoverByTrashingMostSecurity", recover: false },
      { kind: "SelectBind", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1, bindAs: "suspendLocked" } },
      { kind: "Restrict", target: { filter: { boundRef: "suspendLocked" }, count: 1 }, restriction: "suspend", duration: "untilOpponentTurnEnd" },
      { kind: "RawUnparsed", text: "The security-player selector is unresolved; the suspend lock is retained only when its required payment is available." },
      ...recovery,
    ] },
    { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: recovery },
    { trigger: "Main", actions: [
      { kind: "SelectBind", target: { filter: opponentDigimon, count: 1, bindAs: "mainTarget" } },
      { kind: "ModifyDP", target: { filter: { boundRef: "mainTarget" }, count: 1 }, amount: -8000, duration: "untilOpponentTurnEnd" },
      { kind: "SecurityManipulation", op: "trashTop", controller: "mine", amount: 1, optional: true, trackCount: "extraSecurity" },
      { kind: "ModifyDP", target: { filter: { boundRef: "mainTarget" }, count: 1 }, amount: -5000, duration: "untilOpponentTurnEnd", condition: { kind: "namedCountAtLeast", countSource: "extraSecurity", count: 1 } },
    ] },
  ],
  coverage: "partial",
  residual: ["The follow-up suspend lock still needs a proven payment/result seam after the most-security player choice; the executable most-security selector itself is now represented."],
  digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-031", compiled);
