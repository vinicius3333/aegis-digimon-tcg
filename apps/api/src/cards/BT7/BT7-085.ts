// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = { effects: [
  { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["security"], payCost: false }] },
  { trigger: "Main", frequency: "OncePerTurn", actions: [
    { kind: "PlaceUnder", target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }, from: ["trash"], count: 5 }, underFilter: { isSelfRef: true }, position: "bottom", order: "any", optional: true },
    { kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["EmperorGreymon"], match: "name" }] }, from: ["hand"], payCost: true, costOverride: 4, ignoreRequirements: true, optional: true },
  ] },
  { trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 2000 }, { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn", condition: { kind: "selfDpAtLeast", value: 10000 } }] },
], coverage: "full", residual: [] };
registerIrCard("BT7-085", compiled);
