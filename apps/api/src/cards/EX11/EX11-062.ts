import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart:
            "[All Turns] When any Digimon suspend, by suspending this Tamer, if effects suspended those Digimon, ＜Draw 1＞.",
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
              effectTextPart:
                "After, 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait gets +3000 DP until your opponent's turn ends.",
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
