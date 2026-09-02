// HAND-FIXED IR for BT14-054 — do not regenerate. "By unsuspending this Digimon, suspend
// 1 opponent Digimon" compiled its cost as an unparsable `raw` (never payable, so the
// suspend never fired); now a structured `unsuspend` self-cost (payable only when the
// source is suspended, per Comprehensive Rules §15-8-4-4-1).
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
            },
            count: 1,
          },
          cost: {
            kind: "unsuspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By unsuspending this Digimon",
          },
        },
      ],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      optional: true,
      actions: [
        {
          kind: "Attack",
          attacker: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          attackPlayer: false,
          mandatory: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-054", compiled);
