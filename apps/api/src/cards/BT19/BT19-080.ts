// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = {
  effects: [
    { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", amount: 3, condition: { kind: "memory", op: "lte", value: 2, raw: "you have 2 or less memory" } }] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }] }, actions: [{ kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "Raid", raw: "＜Raid＞" }, duration: "forTheTurn", cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" } }, { kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, withoutSuspending: true, attackPlayer: true, mandatory: true }] }] },
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["security"], payCost: false }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-080", compiled);
