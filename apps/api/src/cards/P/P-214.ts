// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const seadramonText = [{ tokens: ["Seadramon"], match: "text" as const }];

const tuckAndReturn = {
  kind: "CostGatedBlock" as const,
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "place" as const,
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: {
      controller: "mine" as const,
      excludeSelf: true,
      kind: ["Digimon"] as const,
      nameOrTrait: seadramonText,
    },
    destination: "digivolutionStack" as const,
    targetIsPermanent: true,
    position: "bottom" as const,
    host: "target" as const,
    raw: "by placing this Digimon under another Digimon with Seadramon in its text",
  },
  actions: [
    {
      kind: "SelectBind" as const,
      target: {
        filter: {
          controller: "mine" as const,
          kind: ["Digimon"] as const,
          nameOrTrait: seadramonText,
        },
        count: 1,
      },
      bindAs: "seadramonLevel",
    },
    {
      kind: "Return" as const,
      target: {
        filter: {
          controller: "opponent" as const,
          kind: ["Digimon"] as const,
          levelComparison: { op: "lte" as const, relativeToSelectionRef: "seadramonLevel" },
        },
        count: 1,
      },
      to: "deckBottom" as const,
    },
  ],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  zone: "digivolutionCards",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Betamon", "ModokiBetamon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              playedByDecode: true,
            },
          ],
          raw: "Decode Betamon or ModokiBetamon",
        },
      ],
      keywords: [{ keyword: "Decode", raw: "＜Decode ([Betamon])/([ModokiBetamon])＞" }],
    },
    { trigger: "OnPlay", actions: [tuckAndReturn] },
    { trigger: "WhenDigivolving", actions: [tuckAndReturn] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          optional: true,
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: seadramonText,
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
            raw: "by trashing 2 same-level cards in its digivolution cards",
          },
          raw: "it doesn't leave",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Betamon", "ModokiBetamon"], cost: 2, isAlternate: true }],
};

registerIrCard("P-214", compiled);
