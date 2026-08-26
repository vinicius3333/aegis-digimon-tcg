// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-069 Baihumon
// [When Digivolving]: "Unsuspend up to 2 Digimon and/or Tamers. Then, gain 1 memory for
//   each of your opponent's unsuspended Digimon and Tamers."
// Q1858: can unsuspend opponent's Digimon or Tamer.
// Q1859: can unsuspend 1 yours and 1 opponent's.
// Q1860: any combination — 2 Digimon, 2 Tamers, or 1 each.
// Fix: remove controllerDefault:"mine" from Unsuspend target (allow any controller).
//
// [End of Your Turn][Once Per Turn]: "For every 2 unsuspended Digimon and/or Tamers your
//   opponent has in play, trash 1 card from the top of your opponent's security stack."
// Q1861: count all opponent's unsuspended Digimon+Tamers, divide by 2 (floor).
// Fix: Trash target needs zone:"security", position:"top" (not a generic opponent filter).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
            upTo: true,
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
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
              zone: "security",
              controller: "opponent",
              position: "top",
            },
            count: 1,
          },
          scaling: {
            per: 2,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-069", compiled);
