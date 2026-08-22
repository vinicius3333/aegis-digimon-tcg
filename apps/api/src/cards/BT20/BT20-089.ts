// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const qualifying = { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }, { tokens: ["SoC", "SEEKERS"], match: "trait" }] };
const mindLink = {
  kind: "MindLink",
  target: { filter: { controller: "mine", kind: ["Digimon"], ...qualifying }, count: 1 },
  optional: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["Eiji Nagasumi", "Leon Alexander"], duration: "permanent" }],
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", actions: [mindLink] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [mindLink] },
      ],
      isInherited: true,
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "GainKeyword", target: { filter: { isSelfRef: true, ...qualifying }, count: 1, isSelf: true }, keyword: { keyword: "Alliance", raw: "＜Alliance＞" }, duration: "permanent" },
        { kind: "GainKeyword", target: { filter: { isSelfRef: true, ...qualifying }, count: 1, isSelf: true }, keyword: { keyword: "Piercing", raw: "＜Piercing＞" }, duration: "permanent" },
        { kind: "GainKeyword", target: { filter: { isSelfRef: true, ...qualifying }, count: 1, isSelf: true }, keyword: { keyword: "Barrier", raw: "＜Barrier＞" }, duration: "permanent" },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } } }],
    },
    {
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false, optional: true }],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["security"], payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-089", compiled);
