// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["King Device"], match: "name" }] }, raw: "you don't have [King Device]" } }] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenTrashedByEffect", sourceFilter: { isSelfRef: true, zone: "battleArea" }, actions: [{ kind: "PlaceInBattleAreaSelf", target: { filter: { controller: "mine", zone: "trash", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }], playCostLte: 3 }, count: 1, from: ["trash"] } }] }] },
    { trigger: "Main", actions: [{ kind: "PlaceInBattleAreaSelf", target: { filter: { controller: "mine", zone: "trash", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }], playCostLte: 3 }, count: 1, from: ["trash"] } }, { kind: "PlaceInBattleAreaSelf" }] },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf", target: { filter: { controller: "mine", zone: "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }] }, count: 1, from: ["hand"] } }, { kind: "AddToHandSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-098", compiled);
