import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Spiral Mountain"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have [Spiral Mountain] in the battle area",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
              faceUp: true,
            },
            count: 1,
          },
          from: ["security"],
          payCost: false,
          optional: true,
        },
        {
          // "At the end of YOUR turn, delete the Digimon this effect played" (KB Q5744). The
          // ＜Delay＞ fires on the opponent's turn, so the delete waits for the controller's next
          // turn end: exactly `DelayedDelete`, which arms the owner-turn-gated watcher on the
          // permanent the PlayWithoutCost above produced (documented behavior —
          // EffectDuration.UntilOwnerTurnEnd + OnEndTurn gated on IsOwnerTurn). Replaces an
          // IMMEDIATE Delete whose `playedByThisEffect` filter the engine never read, so the card
          // deleted an arbitrary permanent on the spot instead of the played one at turn end.
          kind: "DelayedDeletePlayed",
          raw: "at the end of your turn, delete the Digimon this effect played",
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          bindResultAs: "playedByThisEffect",
        },
        {
          kind: "AddToHandSelf",
        },
        {
          // "At turn end, delete the Digimon this effect played" (KB Q5744). A [Security] effect
          // resolves during the OPPONENT's turn and documented behavior arms it with
          // EffectDuration.UntilEachTurnEnd and no owner-turn gate, so the played Digimon dies at
          // the end of THAT turn — not at the controller's next turn end. `DelayedDelete` is
          // therefore wrong here; instead the watcher is ANCHORED (`on`) to the permanent bound by
          // the play above (`bindResultAs`/`boundRef`) and its body deletes its own anchor, so
          // "this Digimon" resolves to exactly the played permanent. This replaces a Delete
          // carrying the never-read `playedByThisEffect` filter, which matched every permanent.
          kind: "SubTrigger",
          event: "endOfTurn",
          on: {
            filter: {
              boundRef: "playedByThisEffect",
            },
            count: 1,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-072", compiled);
