import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// `scaling.filter.faceUp: true` with `unit: "security"` counts only face-up security cards
// (scaling.ts "security" case), and cost kind `flipSecurity` flips the controller's top
// face-up security card face down, failing when there is none (costs.ts). Both are live
// interpreter capabilities, not backlog gaps.
//
// The prevention's protected set is the Replacement's own `sourceFilter` ("any of your
// [Royal Base] trait Digimon"); `runReplacement` skips the nested `Prevent` action entirely,
// so that node carries no target.
const compiled: CompiledCard = {
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    },
  ],
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "permanent",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Royal Base"],
                match: "trait",
              },
            ],
          },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
            },
          ],
          cost: {
            kind: "flipSecurity",
            target: {
              filter: {
                zone: "security",
                controller: "mine",
                position: "top",
                faceUp: true,
              },
              count: 1,
            },
            raw: "by flipping your top face-up security card face down",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-031", compiled);
