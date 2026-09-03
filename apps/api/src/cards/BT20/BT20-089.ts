import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const qualifying = {
  controller: "mine" as const,
  kind: ["Digimon" as const],
  nameOrTrait: [
    { match: "text" as const, tokens: ["Pulsemon"] },
    { match: "trait" as const, tokens: ["SoC", "SEEKERS"] },
  ],
};
const mindLink = {
  kind: "MindLink" as const,
  target: { filter: qualifying, count: 1 },
  optional: true,
};

const inheritedHost = {
  isSelfRef: true,
  nameOrTrait: qualifying.nameOrTrait,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Eiji Nagasumi", "Leon Alexander"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [mindLink],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [mindLink],
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: inheritedHost, count: 1, isSelf: true },
          keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: inheritedHost, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: inheritedHost, count: 1, isSelf: true },
          keyword: { keyword: "Barrier", raw: "＜Barrier＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    },
    {
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "nameExact" }] }, count: 1 },
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-089", compiled);
