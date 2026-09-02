import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "[Your Turn] When this Digimon would digivolve, if you have 3 or fewer security
// cards, <Recovery +1 (Deck)>." — fires once during the digivolve declaration;
// the Replacement.actions run at that moment (KB Q1714: after declaring, before paying).
// SecurityManipulation is the executable Recovery primitive: it places the top deck card
// onto the controller's security stack and evaluates the printed condition at activation.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("BT8-024", compiled);
