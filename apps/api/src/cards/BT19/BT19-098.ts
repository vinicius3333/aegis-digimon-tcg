import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-098 King Device — Purple Option, use cost 4, [Device] trait.
//   (colour waiver)  While you don't have [King Device], you may ignore this card's colour
//     requirements.
//   (on-trash)       When an effect trashes this card in your battle area, place 1 Option card
//     with the [Device] trait with a use cost of 3 or less from your trash into the battle area.
//   [Main]           Place 1 Option card with the [Device] trait with a use cost of 3 or less
//     from your trash into the battle area. Then, place this card in the battle area.
//   [Security]       You may place 1 Option card with the [Device] trait from your hand in the
//     battle area. Then, add this card to the hand.
// No KB entries (`node tools/kb/query.mjs card BT19-098` reports none).

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
              // Bracketed [King Device] is an EXACT name reference; `match: "name"` is the
              // substring form and would let any card whose name merely contains "King
              // Device" suppress the waiver.
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
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
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
        { kind: "AddToHandSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-098", compiled);
