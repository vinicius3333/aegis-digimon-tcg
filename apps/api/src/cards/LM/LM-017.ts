import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const levelFourOrLower = { kind: ["Digimon" as const], levelComparison: { op: "lte" as const, value: 4 } };
const entranceActions = [
  {
    kind: "Trash" as const,
    target: { filter: { controller: "mine" as const, zone: "hand" as const }, count: 1 },
  },
  {
    kind: "PlaceUnder" as const,
    target: {
      filter: {
        zone: "trash" as const,
        controller: "mine" as const,
        nameOrTrait: [{ tokens: ["Gammamon"], match: "text" as const }],
      },
      count: 1,
      from: ["trash" as const],
    },
    // "as this Digimon's BOTTOM digivolution card": no `underFilter`, so the host defaults to
    // the source permanent, and the placement goes under the existing stack.
    position: "bottom" as const,
    optional: true,
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    { trigger: "OnPlay", actions: entranceActions },
    { trigger: "WhenDigivolving", actions: entranceActions },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          raw: "when an effect adds digivolution cards to this Digimon",
          sourceFilter: { isSelfRef: true, byEffect: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { ...levelFourOrLower, zone: "trash", controller: "mine" },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                // "by deleting 1 level 4 or lower Digimon" carries no possessive, so either
                // player's Digimon can pay it.
                target: { filter: { ...levelFourOrLower, controllerDefault: "any" as const }, count: 1 },
                raw: "by deleting 1 level 4 or lower Digimon",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-017", compiled);
