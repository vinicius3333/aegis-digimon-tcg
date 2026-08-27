// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                zone: "battleArea",
                kind: ["Digimon"],
                excludeSelf: true,
                unsuspended: true,
              },
              count: 1,
            },
            raw: "by suspending 1 of your other Digimon",
          },
          dpSource: {
            kind: "suspendedTarget",
          },
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "forThisAttack",
          alsoGainKeywords: [
            {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          ],
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 2000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Lopmon", "Terriermon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-035", compiled);
