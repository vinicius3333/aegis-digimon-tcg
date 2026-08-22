// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenHatch", sourceFilter: { controller: "mine" }, actions: [{ kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }, { kind: "GainMemory", amount: 1 }] }] },
    { trigger: "EndOfYourTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1, cost: { kind: "return", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "By returning this Tamer to the bottom of the deck" }, optional: true, abortOnDecline: true }, { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Tai Kamiya", "Kari Kamiya"], match: "name" }] }, count: 1 }, from: ["hand"], payCost: false, optional: true }] },
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-093", compiled);
