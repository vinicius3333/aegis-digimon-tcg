// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }] },
    { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }] },
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "PlaceUnder", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }], distinctNames: true }, count: 1, upTo: true, from: ["trash"], countModifier: { amount: 2, scaling: { per: 1, filter: { controller: "mine", excludeSelf: true, kind: ["Tamer"] }, unit: "cards" } } }, underFilter: { controllerDefault: "mine", kind: ["Tamer"] }, optional: true }],
    },
    { trigger: "Rule", actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["Takuya Kanbara", "Koji Minamoto"] }] },
    { trigger: "EndOfYourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, attackPlayer: true, mandatory: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-088", compiled);
