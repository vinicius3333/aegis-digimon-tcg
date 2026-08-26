// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The committed catalog drops the icon in "Add 1 card with [icon] or 1 Tamer". The official
// LM-014 card list resolves it as <Blocker>, so this is a keyword filter rather than the
// unrelated <Draw 1> keyword printed on the inherited clause.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                keywords: ["Blocker"],
              },
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                },
              ],
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-014", compiled);
