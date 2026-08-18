// Hand-corrected IR for ST20-04 Garudamon (source documented behavior; KB Q4445-Q4447, Q4693).
// The declarative effect record mis-attached the "for every 2 colors your Tamers have" scaling to the
// ＜Security A. +1＞ grant (so the grant silently no-oped with 0 Tamers in play) and
// the keyword UNCONDITIONALLY for the turn AND gets +2000 DP per 2 Tamer colors.
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
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
              duration: "forTheTurn",
              condition: { kind: "raw", raw: "any of them have the [ADVENTURE] trait" },
            },
          ],
          raw: "When one of your other Digimon is played, 1 of your Digimon gains ＜Alliance＞ for the turn",
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: false,
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
  digivolutionRequirement: [
    { level: 4, traits: ["ADVENTURE"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("ST20-04", compiled);
