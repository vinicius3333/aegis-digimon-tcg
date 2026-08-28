// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX3-024 Slayerdramon
// Text (errata): "[Start of Opponent's Main Phase] By suspending 1 of your Digimon with [Dramon]
//   or [Examon] in its name, your opponent attacks with 1 of their Digimon."
// KB Q3395: "Your opponent chooses." (the attacker)
// KB Q3396: opponent chooses immediately after cost is paid
// KB Q3397: opponent may choose a "can't attack" Digimon (attack fails gracefully)
// KB Q3398: activatable even with no opponent Digimon; effect ends without attack
// Fixes:
//   - Attack action: target = opponent's Digimon (the attacker), opponent chooses
//   - Remove attackPlayer:true (opponent can attack either player or Digimon per normal rules)
//   - Both main and inherited effects have the same correction
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "StartOfOpponentsMainPhase",
      actions: [
        {
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            chooser: "opponent",
          },
          optional: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dramon", "Examon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By suspending 1 of your Digimon with [Dramon] or [Examon] in its name",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "StartOfOpponentsMainPhase",
      actions: [
        {
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            chooser: "opponent",
          },
          optional: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dramon", "Examon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By suspending 1 of your Digimon with [Dramon] or [Examon] in its name",
          },
          abortOnDecline: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Wingdramon"],
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Groundramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-024", compiled);
