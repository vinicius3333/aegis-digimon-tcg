import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentSuspendedDigimon = { controller: "opponent", kind: ["Digimon"], suspended: true } satisfies Filter;
const playable = {
  controller: "mine",
  zone: "hand",
  nameOrTrait: [{ tokens: ["Vegetation", "TS"], match: "trait" }],
} satisfies Filter;
// CR 16-42-3/3-4-6: <Use Req.> is satisfied by a matching Digimon/Tamer anywhere on "the
// field", which includes the breeding area (unlike free-text pre-keyword waivers, CR 3-4-7-8).
const ts = {
  controller: "mine",
  zone: ["battleArea", "breeding"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
} satisfies Filter;
const opponentDigimonOrTamer = { controller: "opponent", kind: ["Digimon", "Tamer"] } satisfies Filter;
const ceresmon = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Ceresmon"], match: "nameExact" }],
} satisfies Filter;
const digivolveBody = [
  {
    kind: "ModifyDP",
    target: { filter: opponentSuspendedDigimon, count: "all" },
    amount: -5000,
    duration: "untilOpponentTurnEnd",
  },
  { kind: "Suspend", target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 }, optional: true },
  {
    kind: "Modal",
    choose: 1,
    condition: {
      kind: "allOf",
      conditions: [{ kind: "ifThisEffectActed" }, { kind: "isYourTurn", raw: "if it's your turn" }],
    },
    options: [
      [
        {
          kind: "UseOptionWithoutCost",
          filter: { ...playable, kind: ["Option"] },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 5,
          optional: true,
        },
      ],
      [
        {
          kind: "PlayWithoutCost",
          target: { filter: { ...playable, kind: ["Digimon", "Tamer"] }, count: 1 },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 5,
          optional: true,
        },
      ],
    ],
  },
] satisfies Action[];

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Alliance", raw: "＜Alliance＞" },
    { keyword: "Succession", raw: "＜Succession ([Ceresmon])＞" },
  ],
  effects: [
    { trigger: "WhenDigivolving", actions: digivolveBody },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Vegetation"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      keywordEffect: "Succession",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "effects",
          filter: ceresmon,
          topmostOnly: true,
          excludeKeywords: ["Succession"],
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: ts } }],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Suspend",
          target: { filter: opponentDigimonOrTamer, count: 2, upTo: true },
          optional: true,
        },
        {
          kind: "Restrict",
          target: { filter: opponentDigimonOrTamer, count: 3 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Ceresmon"], basePlayCost: 12, cost: 2, isAlternate: true }],
};

registerIrCard("BT26-032", compiled);
