import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playOrUseDataSquad: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a DATA SQUAD card", "Use a DATA SQUAD Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            playCostLte: 5,
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: {
          controller: "mine",
          kind: ["Option"],
          nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          playCostLte: 5,
        },
        from: ["hand"],
        payCost: false,
      },
    ],
  ],
  cost: {
    kind: "trash",
    target: {
      filter: {
        controller: "mine",
        zone: "digivolutionCards",
        faceDown: true,
        hostFilter: { kind: ["Tamer"] },
        position: "bottom",
      },
      count: 2,
    },
    raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
  },
  optional: true,
  abortOnDecline: true,
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -5000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
        playOrUseDataSquad,
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -5000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
        playOrUseDataSquad,
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -5000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
        playOrUseDataSquad,
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["ShineGreymon"],
                match: "name",
              },
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          actions: [],
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                faceDown: true,
                hostFilter: {
                  kind: ["Tamer"],
                },
                position: "bottom",
              },
              count: 1,
            },
            raw: "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave",
          },
          raw: "it doesn't leave",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["GeoGreymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DATA SQUAD"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-06", compiled);
