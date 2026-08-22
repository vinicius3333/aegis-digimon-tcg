// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkedSource = { controllerDefault: "mine", zone: "digivolutionCards", kind: ["Digimon"], levels: [3], hasLinkRequirement: true, nameOrTrait: [
  { tokens: ["Life"], match: "trait" },
  { tokens: ["System"], match: "trait" },
  { tokens: ["Seven Code"], match: "trait" },
] };
const opponentDigimon = { controllerDefault: "opponent", kind: ["Digimon"] };
const linkAction = { kind: "Link", target: { filter: linkedSource, count: 1 }, recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["digivolutionCards"], payCost: false, optional: true };
const linkingEffect = [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [
  { kind: "Restrict", target: { filter: opponentDigimon, count: 1 }, restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" },
  { kind: "ModifyDP", target: { filter: opponentDigimon, count: 1 }, amount: -3000, duration: "untilOpponentTurnEnd" },
] }];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [
      { keyword: "Barrier", raw: "＜Barrier＞" },
      { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
    ] },
    { trigger: "OnPlay", actions: [linkAction] },
    { trigger: "WhenDigivolving", actions: [linkAction] },
    { trigger: "Static", isLinked: true, actions: linkingEffect },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["WG"], cost: 2 }],
};

registerIrCard("BT26-028", compiled);
