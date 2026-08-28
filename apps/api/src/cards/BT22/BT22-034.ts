// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-034 Reppamon
// Fix: "When effects trash this card from security" was encoded as a dead Static→SubTrigger
//   (whenTrashedFromSecurity never fires); corrected to EffectTiming.OnDiscardSecurity, which
//   fires only from the effect-driven trash-from-security seam (GameEngine.fireDiscardedFromSecurity)
//   — self-scoped and effect-only by construction. The "instead" clause is optional cost: pay
//   trash top security to replace -3000 DP with -6000 DP (KB Q4880: "instead" means the
//   alternate processing replaces the standard processing when cost is paid).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDiscardSecurity",
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
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -6000,
                duration: "untilOpponentTurnEnd",
                cost: { kind: "trashSecurityTop", raw: "By trashing your top security card" },
                optional: true,
                abortOnDecline: true,
              },
            ],
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -3000,
                duration: "untilOpponentTurnEnd",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -6000,
                duration: "untilOpponentTurnEnd",
                cost: { kind: "trashSecurityTop", raw: "By trashing your top security card" },
                optional: true,
                abortOnDecline: true,
              },
            ],
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -3000,
                duration: "untilOpponentTurnEnd",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          amount: -2000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["CS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-034", compiled);
