// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mainActions = [
  {
    kind: "PlaceUnder",
    target: { filter: { controller: "mine" }, count: 1 },
    fromDeckTop: true,
    faceDown: true,
    position: "bottom",
  },
  {
    kind: "GainMemory",
    amount: 1,
    condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Marcus Damon", "Thomas H. Norstein"],
        },
      ],
    },
    { trigger: "OnPlay", actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })) },
    {
      trigger: "StartOfYourMainPhase",
      actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })),
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardDiscarded",
          hostFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
                },
                count: 1,
              },
              keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
              duration: "forTheTurn",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST24-13", compiled);
