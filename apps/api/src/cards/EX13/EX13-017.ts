import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// "1 card with [Veedramon] in its text or the [Royal Knight] trait" is a single UNION slot, not
// two slots: `nameOrTrait` entries are OR-matched, so one `add` entry with `count: 1` takes
// exactly one card from the union (KB Q2625 / cf. EX12-009, whose two INDEPENDENT trait clauses
// justify two entries). `orPrevious` marks the union explicitly.
//
// "in its text" is `match: "text"`, the full card-information union — a card merely NAMED
// Veedramon has [Veedramon] in its text too (matching/definition.ts, "text" branch), so
// BT22-022 Veedramon qualifies alongside BT22-019 Veemon, which only prints the token.
// "the [Royal Knight] trait" is the EXACT trait reading (`match: "trait"`), so a [Royal Base]
// card such as BT18-044 FunBeemon is refused.
//
// The add is mandatory ("Add 1 card ... to the hand", no "you may"), so no `optional`/`upTo`.
// `rest: "deckBottom"` is the printed "Return the rest to the bottom of the deck"; per the
// official rule manual the controller chooses that order, which the shared primitive owns.
const revealAdd = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        nameOrTrait: [
          { tokens: ["Veedramon"], match: "text" },
          { tokens: ["Royal Knight"], match: "trait", orPrevious: true },
        ],
      },
      count: 1,
      to: "hand",
    },
  ],
  rest: "deckBottom",
});

// The inherited clause is printed identically on BT22-019 / BT22-022 Veemon-line cards, so it
// reuses their shape: a `wouldLeavePlay` prevention gated on `leaveCause: "opponentEffect"`,
// whose cost is suspending the host. `isSelfRef` + `match: "name"` is the substring reading, so
// AeroVeedramon/UlforceVeedramon hosts are protected and a plain Veemon host is not.
const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenMoving", actions: [revealAdd()] },
    { trigger: "OnPlay", actions: [revealAdd()] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending it",
              },
              optional: true,
              abortOnDecline: true,
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
  digivolutionRequirement: [{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-017", compiled);
