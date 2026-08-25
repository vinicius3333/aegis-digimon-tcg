// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// CATALOG DATA GAP (recorded in the LM audit ledger): the committed effectText reads
// "Add 1 card with  or 1 Tamer card among them to the hand" — the keyword icon between
// "with" and "or" did not survive the card import. Every keyword icon in this set is stripped
// the same way (LM-004's <Blocker>, LM-005's <Security Attack +1>, LM-009's <Rush>, and the
// <Draw 1> in this card's own inherited clause), so the glyph is unrecoverable from committed
// data. The reading kept here — a card whose text carries <Draw 1> — matches the only icon this
// card itself names; it is the narrowest reading consistent with the committed record, and a
// single `tokens` edit switches it if the printed icon is ever confirmed to be another.
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
                nameOrTrait: [{ tokens: ["Draw"], match: "text" }],
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
