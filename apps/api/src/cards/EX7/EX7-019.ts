// HAND-FIXED IR for EX7-019 (Sorcermon) — do not regenerate over this file.
//
// Two generator miscompiles fixed against the printed text:
//   1. "[On Play] If your opponent has NO Digimon with digivolution cards, unsuspend 1
//      of your Digimon" compiled the gate as a positive `opponentHas` (inverted) and
//      dropped the with-digivolution-cards qualifier — now `opponentHasNone` +
//      `digivolutionCards: "hasAny"`.
//   2. The inherited "[When Attacking] [Once Per Turn] Trash the top digivolution card
//      of 1 of your opponent's Digimon" compiled as a field `Trash` of the Digimon
//      itself — now `TrashDigivolution` (amount 1, fromTop).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type Effects = CompiledCard["effects"];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          condition: {
            kind: "opponentHasNone",
            filter: {
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
        },
      ],
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
          tokens: ["Ice-Snow"],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 1,
          fromTop: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ] as unknown as Effects,
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-019", compiled);
