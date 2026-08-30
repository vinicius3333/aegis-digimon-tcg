// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR: the Counter marker must carry Blast Digivolve so the engine's
// hand-based counter eligibility and cost-waived digivolution path can see it.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "RedirectAttack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "duringAttack",
            raw: "one of their Digimon is attacking",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "RedirectAttack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "duringAttack",
            raw: "one of their Digimon is attacking",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
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
          duration: "permanent",
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-049", compiled);
export { compiled };
