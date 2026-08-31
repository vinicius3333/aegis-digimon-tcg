// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-059 Justimon: Blitz Arm
// Fix: trash cost targets ANY effect-placed Option in battle area (no controller restriction).
//   [All Turns] unsuspend + immunity moved inside SubTrigger(whenOptionInBattleAreaTrashed).
//   New event `whenOptionInBattleAreaTrashed` specified in LANE_H.md (CAP-H-06).
//   Q5323: the trash targets Option cards placed by "place this card in the battle area" effects.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "By trashing 1 effect-placed Option card in the battle area (Q5323)",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "By trashing 1 effect-placed Option card in the battle area (Q5323)",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "By trashing 1 effect-placed Option card in the battle area (Q5323)",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionInBattleAreaTrashed",
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
            {
              kind: "GrantStatic",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              grant: "immuneToOpponentDigimonEffects",
              tokens: [],
              duration: "forTheTurn",
            },
          ],
          raw: "When Option cards in the battle area are trashed, this Digimon unsuspends. Then, your opponent's Digimon's effects don't affect this Digimon for the turn",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Justimon: Accel Arm", "Justimon: Critical Arm"],
      cost: 1,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-059", compiled);
