import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT14-047 (Dokugumon).
// effectText: "[On Play][When Digivolving] Suspend 1 of your opponent's Digimon. During your
// opponent's next unsuspend phase, all of your opponent's Digimon with 5000 DP or less don't
// unsuspend."
// KB Q2416 confirms the DP<=5000 target set is locked at activation time (a Digimon whose DP
// later drops to <=5000 still unsuspends; one that later rises above 5000 still stays down) —
// i.e. this is a one-shot Restrict("unsuspend") seeded on the qualifying set, not a live re-
// evaluated filter. The declarative effect record used a bogus "Unsuspend" action kind (which actually
// unsuspends the target — the opposite of the card's intent) instead of "Restrict" with
// restriction:"unsuspend" (the BT3-057/BT12-106/EX12-063 pattern for "doesn't unsuspend next
// unsuspend phase").
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
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
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
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
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-047", compiled);
