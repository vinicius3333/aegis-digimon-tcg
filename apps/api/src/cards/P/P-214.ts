import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const seadramonText = [{ tokens: ["Seadramon"], match: "text" as const }];

const tuckAndReturn: Action = {
  kind: "CostGatedBlock",
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "place",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    underFilter: {
      controller: "mine",
      excludeSelf: true,
      kind: ["Digimon"],
      nameOrTrait: seadramonText,
    },
    destination: "digivolutionStack",
    targetIsPermanent: true,
    position: "bottom",
    host: "target",
    raw: "by placing this Digimon under another Digimon with Seadramon in its text",
  },
  actions: [
    {
      kind: "SelectBind",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: seadramonText,
        },
        count: 1,
        bindAs: "seadramonLevel",
      },
    },
    {
      kind: "Return",
      target: {
        filter: {
          controller: "opponent",
          kind: ["Digimon"],
          relativeTo: { attr: "level", op: "lte", selectionRef: "seadramonLevel" },
        },
        count: 1,
      },
      to: "deckBottom",
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
