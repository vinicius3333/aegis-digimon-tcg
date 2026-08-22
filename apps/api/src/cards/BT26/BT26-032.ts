// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentSuspendedDigimon = { controller: "opponent", kind: ["Digimon"], suspended: true };
const opponentDigimonOrTamer = { controller: "opponent", kind: ["Digimon", "Tamer"] };
const playable = { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Vegetation", "TS"], match: "trait" }] };
const ceresmon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ceresmon"], match: "name" }] };

const digivolveBody = [
  { kind: "ModifyDP", target: { filter: opponentSuspendedDigimon, count: "all" }, amount: -5000, duration: "untilOpponentTurnEnd" },
  { kind: "Suspend", target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 }, optional: true },
  { kind: "Modal", choose: 1, condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind: "isYourTurn", raw: "if it's your turn" }] }, options: [
    [{ kind: "UseOptionWithoutCost", filter: { ...playable, kind: ["Option"] }, from: ["hand"], payCost: true, reduceCostBy: 5, optional: true }],
    [{ kind: "PlayWithoutCost", target: { filter: { ...playable, kind: ["Digimon", "Tamer"] }, count: 1 }, from: ["hand"], payCost: true, reduceCostBy: 5, optional: true }],
  ] },
];

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Succession", raw: "＜Succession ([Ceresmon])＞" }],
  effects: [
    { trigger: "WhenDigivolving", actions: digivolveBody },
    { trigger: "Static", actions: [
      { kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "effects", filter: ceresmon, duration: "permanent" },
      { kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "trait", tokens: ["Vegetation"], duration: "permanent" },
      { kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: { controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } } },
    ] },
    { trigger: "Main", actions: [
      { kind: "Suspend", target: { filter: opponentDigimonOrTamer, count: 2 }, optional: true },
      { kind: "Restrict", target: { filter: opponentDigimonOrTamer, count: 3 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectActed" } },
    ] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, names: ["Ceresmon"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-032", compiled);
