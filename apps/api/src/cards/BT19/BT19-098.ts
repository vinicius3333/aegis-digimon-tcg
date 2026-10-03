import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["King Device"], match: "nameExact" }],
            },
            raw: "you don't have [King Device]",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedByEffect",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
          actions: [
            {
              kind: "PlaceInBattleAreaSelf",
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                  playCostLte: 3,
                },
                count: 1,
                from: ["trash"],
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Place 1 Option card with the [Device] trait with a use cost of 3 or less from your trash into the battle area.",
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
              playCostLte: 3,
            },
            count: 1,
            from: ["trash"],
          },
        },
        { effectTextPart: "Then, place this card in the battle area.", kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may place 1 Option card with the [Device] trait from your hand in the battle area.",
          kind: "PlaceInBattleAreaSelf",
          optional: true,
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
            },
            count: 1,
            from: ["hand"],
          },
        },
        { effectTextPart: "Then, add this card to the hand.", kind: "AddToHandSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-098", compiled);
