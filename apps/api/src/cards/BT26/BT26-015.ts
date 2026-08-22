// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const opponentLowDp = { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } };
const ownDigimon = { controller: "mine", kind: ["Digimon"] };
const ts = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };

const onPlayBody = [
  { kind: "ModifyDP", target: { filter: opponentDigimon, count: 1 }, amount: -4000, duration: "untilOpponentTurnEnd" },
  { kind: "Return", target: { filter: { controller: "mine", zone: "trash" }, count: 1 }, from: ["trash"], to: "deckBottom", optional: true, trackCount: "returnedTrash" },
  { kind: "Delete", target: { filter: opponentLowDp, count: 1 }, condition: { kind: "ifThisEffectActed" } },
];

const reactiveBuff = [
  { kind: "SelectBind", target: { filter: ownDigimon, count: 1, bindAs: "buffTarget" } },
  { kind: "ModifyDP", target: { filter: { boundRef: "buffTarget" }, count: 1 }, amount: 3000, duration: "untilOpponentTurnEnd" },
  { kind: "Attack", target: { filter: { boundRef: "buffTarget" }, count: 1 }, mandatory: true },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: onPlayBody },
    { trigger: "WhenDigivolving", actions: onPlayBody },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToDeck", effectSourceFilter: { controller: "mine" }, actions: reactiveBuff, raw: "When your effect adds cards to a deck, 1 of your Digimon may get +3000 DP and attack." }] },
    { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToDeck", effectSourceFilter: { controller: "mine" }, actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1 }, optional: true }], raw: "When your effect adds cards to a deck, this Digimon with Chronomon in its text may unsuspend." }] },
  ],
  coverage: "partial",
  residual: ["The inherited watcher still lacks a host-text predicate for 'this Digimon with Chronomon in its text'; the unsuspend action is retained without silently claiming that gate."],
  digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-015", compiled);
