// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns][Once Per Turn]: When other [Royal Base] Digimon would leave the battle area
// BY EFFECTS, by placing this Digimon as the face-up bottom security card, they don't leave.
// KB Q3098: all simultaneously-leaving Digimon are all prevented (no per-Digimon selection).
// The trigger condition is leave-by-effects only, not combat/battle resolution.
// Mode "prevent" indicates the leaving is cancelled entirely; cost is the placement.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            leaveReason: "effect",
          },
          cost: {
            kind: "placeAsSecurity",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            position: "faceUpBottom",
            raw: "by placing this Digimon as the face-up bottom security card",
          },
          actions: [],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Insectoid"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Royal Base"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-048", compiled);
