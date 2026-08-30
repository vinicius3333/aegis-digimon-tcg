// @ts-nocheck
// HAND-FIXED IR for BT13-058 (Leopardmon: Leopard Mode) — do not regenerate over this file.
// Printed text: "[When Digivolving] Suspend 1 of your opponent's Digimon. Until the end of
// your opponent's turn, 1 of your opponent's Digimon doesn't unsuspend." The generator
// mistranslated the negative "doesn't unsuspend" restriction as a literal Unsuspend action —
// the opposite effect, which immediately undid the preceding Suspend. Fixed to Restrict
// (restriction: "unsuspend", duration: "untilOpponentTurnEnd"), the same shape already used
// by the sibling cards BT13-059/BT13-060 for this exact family ability.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              unsuspended: true,
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
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
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By suspending 1 of your other Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
            topCardOnly: true,
          },
        },
        {
          kind: "Unsuspend",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: "all",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Leopardmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT13-058", compiled);
