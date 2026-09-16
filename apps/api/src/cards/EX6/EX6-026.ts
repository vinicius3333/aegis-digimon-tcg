import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Attacking] [Once Per Turn] 1 Digimon may gain ＜Security Attack -1＞until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if DigiXrosing, this Digimon gets +3000 DP and ＜Blocker＞until the end of your opponent's turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digiXrosCount",
          },
        },
        {
          effectTextPart:
            "[On Play] [When Attacking] [Once Per Turn] 1 Digimon may gain ＜Security Attack -1＞until the end of your opponent's turn.",
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
          condition: {
            kind: "digiXrosCount",
          },
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
            "[On Play] [When Attacking] [Once Per Turn] 1 Digimon may gain ＜Security Attack -1＞until the end of your opponent's turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
          optional: true,
        },
        {
          effectTextPart:
            "Then, if DigiXrosing, this Digimon gets +3000 DP and ＜Blocker＞until the end of your opponent's turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "digiXrosCount",
          },
        },
        {
          effectTextPart:
            "[On Play] [When Attacking] [Once Per Turn] 1 Digimon may gain ＜Security Attack -1＞until the end of your opponent's turn.",
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
          condition: {
            kind: "digiXrosCount",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  kind: ["Digimon"],
                  colors: ["Yellow"],
                  controller: "mine",
                  zone: "digivolutionCards",
                  hostFilter: {
                    isSelfRef: true,
                  },
                },
                count: 1,
              },
              to: "hand",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Sanzomon", "Gokuumon", "Sagomon"],
        },
      ],
      count: 2,
      maxMaterials: 1,
    },
  ],
};

registerIrCard("EX6-026", compiled);
