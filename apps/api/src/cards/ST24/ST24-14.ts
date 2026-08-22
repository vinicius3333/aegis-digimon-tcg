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
    { trigger: "OnPlay", actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })) },
    {
      trigger: "StartOfYourMainPhase",
      actions: mainActions.map((action, index) => ({ ...action, optional: index === 0 })),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          hostFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
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

registerIrCard("ST24-14", compiled);
