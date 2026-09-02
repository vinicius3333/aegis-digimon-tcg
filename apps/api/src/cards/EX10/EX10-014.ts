import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
//
// KNOWN TYPE GAP (seam request, EX10 audit batch B): `event: "whenSecurityBattleEnded"` is a
// REAL runtime event — `securityCheck.ts` fires it after the security battle resolves and
// `interpreter/actions/subTrigger.ts` subscribes it with a dedicated gate — but it is missing
// from the shared `SubTriggerEvent` union in
// packages/shared/src/effects/ir/actions/subTrigger.ts, so this module cannot typecheck
// without editing shared. `timing: "endOfBattle"` is provenance-only annotation (see
// CardEffect.timing); the SubTrigger is what actually defers the play. Same shape as the
// proven BT3-011 / BT23-007 / BT23-010 / BT23-028 / BT23-052 siblings. Do not "fix" this by
// deleting the SubTrigger — that would resolve the play during the security check instead of
// after the battle.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
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
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isLinked: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -6000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "linked",
                isSelfRef: true,
              },
              count: 1,
            },
            raw: "By trashing 1 of this Digimon's link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
};

export { compiled };

registerIrCard("EX10-014", compiled);
