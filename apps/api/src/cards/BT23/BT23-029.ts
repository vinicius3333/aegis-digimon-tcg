// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playWatcherUseKey = "bt23-029/play-watcher";

// Hand-authored override for BT23-029 (Antylamon).
// [All Turns] [Once Per Turn] When any of your cards with [Beast], [Beastkin] or [CS]
// trait are played, 1 of your opponent's Digimon can't activate [When Digivolving] effects
// until the end of your opponent's turn.
// KB Q5265: also triggers when this card itself is played.
// KB Q5266-Q5270: restriction prevents all [When Digivolving] activations (direct & via effects).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    // The card's All Turns watcher includes the play of Antylamon itself. The entry-window
    // snapshot cannot observe a watcher installed by that same play, so mirror that one
    // self-play event through the direct On Play timing while retaining the watcher for peers.
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: playWatcherUseKey,
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Beast", "Beastkin", "CS"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "When any of your cards with the [Beast], [Beastkin] or [CS] trait are played, until your opponent's turn ends, 1 of their Digimon can't activate [When Digivolving] effects",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: playWatcherUseKey,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -4000,
              duration: "forTheTurn",
            },
          ],
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
      names: ["Turuiemon", "Wendigomon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-029", compiled);
