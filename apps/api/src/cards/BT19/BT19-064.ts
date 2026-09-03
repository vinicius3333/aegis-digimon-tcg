import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-064 Justimon: Blitz Arm
// [Hand][Counter] <Blast Digivolve>
// [On Play][When Digivolving] This Digimon gains <Blocker> and isn't affected by your
//   opponent's Digimon's effects until the end of your opponent's turn.
// [When Digivolving][When Attacking][Once Per Turn] By trashing 1 Option card in the
//   battle area, unsuspend this Digimon.
// Q&A: "1 Option card in the battle area" includes either player's Option card.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
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
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
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
          duration: "untilOpponentTurnEnd",
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
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
          duration: "untilOpponentTurnEnd",
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controllerDefault: "any",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "By trashing 1 Option card in the battle area",
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
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                controllerDefault: "any",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
              count: 1,
            },
            raw: "By trashing 1 Option card in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
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
  ],
};

registerIrCard("BT19-064", compiled);
