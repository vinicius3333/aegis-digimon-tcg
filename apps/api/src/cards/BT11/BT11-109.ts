import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = { effects: [
  { trigger: "Main", actions: [{ kind: "PlaceUnder", target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] }, count: 3, upTo: true, from: ["trash"] }, underFilter: { controller: "mine", kind: ["Digimon", "Tamer"] }, optional: true }, { kind: "PlaceUnder", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, underFilter: { controller: "opponent", excludeSelf: true, kind: ["Digimon"] }, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] }, raw: "you have a Digimon or Tamer with [Bagra Army] in its traits in play" }, optional: true }] },
  { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
], coverage: "full", residual: [] };
registerIrCard("BT11-109", compiled);
