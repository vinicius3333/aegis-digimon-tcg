// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ts = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const tsCard = { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const tsDigimon = { ...ts, levelLte: 99 };
const namedTamer = { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Dan Yuki", "Kanan Yuki"], match: "name" }] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: ts, raw: "you have a TS trait card" } }] },
    { trigger: "Main", actions: [
      { kind: "GainKeyword", target: { filter: ts, count: "all" }, keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd", condition: { kind: "youHave", filter: namedTamer } },
      { kind: "ModifyDP", target: { filter: ts, count: "all" }, amount: 3000, duration: "untilOpponentTurnEnd", condition: { kind: "youHave", filter: namedTamer } },
      { kind: "Modal", choose: 1, options: [
        [{ kind: "RawUnparsed", text: "Delete 1 of your opponent's Digimon with DP no greater than a TS Digimon you control." }],
        [{ kind: "Unsuspend", target: { filter: ts, count: 1 }, optional: true }],
      ] },
    ] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: tsCard, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true }] },
  ],
  coverage: "partial",
  residual: ["The delete modal's live threshold against the greatest DP among your TS Digimon is not expressible by the current filter IR; retained as loud RawUnparsed action."],
};

registerIrCard("BT26-101", compiled);
