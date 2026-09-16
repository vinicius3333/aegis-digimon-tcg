import type { CompiledCard, Action } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grantActions = (): Action[] => [
  {
    kind: "SelectBind",
    target: {
      filter: { controller: "mine", kind: ["Digimon"] },
      count: 1,
      bindAs: "granted",
    },
  },
  {
    kind: "GainKeyword",
    target: { fromSelectionRef: "granted", filter: {}, count: 1 },
    keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    duration: "forTheTurn",
  },
  {
    kind: "ModifyDP",
    target: { fromSelectionRef: "granted", filter: {}, count: 1 },
    amount: 2000,
    duration: "forTheTurn",
    scaling: {
      per: 2,
      filter: { controller: "mine", kind: ["Tamer"] },
      unit: "colors",
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: grantActions(),
    },
    {
      trigger: "WhenDigivolving",
      actions: grantActions(),
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              effectTextPart:
                "[Your Turn] [Once Per Turn] When your other Digimon are played or digivolve, if any of them have the [ADVENTURE] trait, 1 of your Digimon gains ＜Alliance＞ for the turn.",
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
              effectTextPart: "Then, 1 of your Digimon may attack.",
              kind: "Attack",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              withoutSuspending: false,
              optional: true,
            },
          ],
          raw: "When one of your other Digimon is played, 1 of your Digimon gains ＜Alliance＞ for the turn",
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              effectTextPart:
                "[Your Turn] [Once Per Turn] When your other Digimon are played or digivolve, if any of them have the [ADVENTURE] trait, 1 of your Digimon gains ＜Alliance＞ for the turn.",
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
              effectTextPart: "Then, 1 of your Digimon may attack.",
              kind: "Attack",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              withoutSuspending: false,
              optional: true,
            },
          ],
          raw: "When one of your other Digimon digivolves, 1 of your Digimon gains ＜Alliance＞ for the turn",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["ADVENTURE"], cost: 3, isAlternate: true }],
};

registerIrCard("ST20-04", compiled);
