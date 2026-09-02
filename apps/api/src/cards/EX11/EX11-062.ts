import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for EX11-062 — Shoto Kazama (Green Tamer).
//
// KB rulings applied:
//   Q5917: "by suspending this Tamer" is a mandatory cost for the whole [All Turns]
//     effect; without paying the cost, neither Draw 1 nor +3000 DP resolve.
//   Q5918: Draw 1 is gated on "if effects suspended those Digimon" — rules suspends
//     from attack/block do not qualify.
//   Q6517 (2026-05-08, authoritative — overrides earlier Q5918 reading of +3000DP):
//     the +3000 DP resolves regardless of whether suspension was by effects or rules.
//   Q5826/Q5921: [Your Turn] widens Vortex attack declarations to include players;
//     it does not change attack targets mid-combat.
//   Q5919: "no unsuspended Digimon" condition is also met when opponent has no Digimon.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
            raw: "you have 2 or less memory",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "triggeredByEffect",
                raw: "if effects suspended those Digimon",
              },
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Avian", "Bird"],
                      match: "traitContains",
                    },
                    {
                      tokens: ["Vortex Warriors"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              amount: 3000,
              duration: "untilOpponentTurnEnd",
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          raw: "When any Digimon suspend, by suspending this Tamer, if effects suspended those Digimon, ＜Draw 1＞ After, 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantVortexCanAttackPlayers",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          duration: "forTheTurn",
          condition: {
            kind: "opponentHasNone",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              unsuspended: true,
            },
            raw: "while your opponent has no unsuspended Digimon",
          },
          raw: "your ＜Vortex＞ can also attack players",
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-062", compiled);
