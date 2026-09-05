import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-019 (Nezhamon).
// runtime-effect fixes:
// - 1st [All Turns]: text says "their Digimon effects don't affect this Digimon" (opponent
//   Digimon-sourced effects only). `GrantImmunity`'s `immuneFrom: "opponentEffects"` blocks
//   ALL opponent effects (Options/Tamers too), so it's replaced with the dedicated `Restrict`
//   action + `fromSourceKind: ["Digimon"]` + `byOpponentEffectsOnly: true` (CAP-#8, see
//   ex12Gap8Immunity.test.ts).
// - 2nd [All Turns]: text says "When security stacks are removed from, this Digimon may
//   unsuspend" — a triggered ability, not an unconditional per-turn Unsuspend on any of my
//   Digimon. Wrapped in a `whenSecurityRemoved` SubTrigger (AD1-017 pattern) and the Unsuspend
//   target narrowed to the source itself (isSelfRef).
// - ＜Engage＞ ("[End of Your Turn] this Digimon may attack") was only recorded in `residual`
//   with no behavior. Encoded as a `GainKeyword` marker plus an `EndOfYourTurn` ->
//   `Attack(self, optional:true)` action, the established pattern for this keyword
//   (EX12-060 and 21 other cards).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Rush",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Collision",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Piercing",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Engage",
          raw: "＜Engage＞",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              restriction: "beAffected",
              fromSourceKind: ["Digimon"],
              byOpponentEffectsOnly: true,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 4000,
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "whenAttackTargetSwitched",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "any",
          },
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
              optional: true,
            },
          ],
          raw: "whenSecurityRemoved",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-019", compiled);
