import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
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
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "by trashing 1 Option card in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
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
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "by trashing 1 Option card in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
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
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "battleArea",
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "by trashing 1 Option card in the battle area",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "Then, by trashing 1 Option card in the battle area, this Digimon gains ＜Piercing＞ and ＜Security A. +1＞ for the turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
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
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              restriction: "attackPlayers",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Justimon: Blitz Arm", "Justimon: Critical Arm"],
      cost: 1,
      isAlternate: true,
    },
    {
      level: 5,
      names: ["Cyberdramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-203", compiled);
