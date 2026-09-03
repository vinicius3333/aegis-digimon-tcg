import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1428: "you may," player can choose not to trash.
// KB Q1429: cannot activate if security stack is empty.
// KB Q1430: AllTurns Recovery effect triggers if <=3 security after trash.
// KB Q1431: multiple copies activate sequentially; once security reaches 4 the remaining
//   copies don't activate — modeled via condition check per-activation.
// Fixed: cost uses trashSecurityTop (not generic trash); rest is "trash" not "deckBottom".
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 6,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
              },
              count: 2,
              to: "hand",
              upTo: true,
            },
          ],
          rest: "trash",
          cost: {
            kind: "trashSecurityTop",
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              amount: 1,
              source: "deck",
              toTop: true,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-044", compiled);
