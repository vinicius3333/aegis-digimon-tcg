// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Four Great Dragons"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          bindResultAs: "playedByThisEffect",
        },
        {
          // "The Digimon played by this effect can't digivolve to level 7". `boundRef` names the
          // permanent the play above produced; the declarative effect record used the never-read
          // `playedByThisEffect` filter here, so the restriction landed on an arbitrary Digimon.
          kind: "Restrict",
          target: {
            filter: {
              boundRef: "playedByThisEffect",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "digivolveToLevel7",
          duration: "permanent",
        },
        {
          // Errata (2025-04-25): "at the NEXT end of your opponent's turn, delete that Digimon";
          // KB Q5722 makes it one-shot — only the FIRST opponent turn end after the play, so a
          // Digimon that survives that deletion is not deleted at later opponent turn ends
          // (`once`). Q3433: it is still "the Digimon played by this effect" after De-Digivolve or
          // added digivolution cards, i.e. the PERMANENT is tracked — so the watcher is anchored
          // (`on`) to the bound played permanent and deletes its own anchor, replacing the
          // never-read `playedByThisEffect` filter that matched every Digimon on the board.
          // documented behavior (UntilOpponentTurnEndEffects + OnEndTurn, maxCount 1).
          kind: "SubTrigger",
          event: "endOfOpponentTurn",
          once: true,
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
          raw: "at the next end of your opponent's turn, delete that Digimon",
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
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-069", compiled);
