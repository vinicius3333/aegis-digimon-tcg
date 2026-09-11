import type { Action, CompiledCard, Cost, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-032 Chirinmon (Yellow Lv.5 Ultimate, [Holy Beast]/[DATA SQUAD], Vaccine, 7000 DP,
// play cost 7, printed EvoCost: Yellow Lv.4 for 3).
//
// Printed clauses:
//   [Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3
//   [When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card or the
//     bottom face-down card from under any of your Tamers, this Digimon unsuspends. After, 1 of
//     your opponent's Digimon can't activate [When Digivolving] effects until their turn ends.
//   [All Turns] When this Digimon would leave the battle area, by placing its top stacked card as
//     the top security card, it doesn't leave.
//   Inherited: [All Turns] [Once Per Turn] When this Digimon with [Kentaurosmon] in its name would
//     leave the battle area, by placing its top stacked card as the top security card, it doesn't
//     leave.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §15-7 Optional Processing Conditions: "by X, Y" is an optional processing condition — the
//     controller may always decline, and when the condition is not executed nothing after it
//     happens (§15-7-2). Hence every clause here is a cost-gated block with
//     `optional: true` / `abortOnDecline: true` rather than a mandatory action, and the printed
//     "After, …" restriction sits INSIDE the gated block so it cannot resolve unpaid.
//   - §15-7-4: the controller may choose to attempt a condition it cannot actually perform, so
//     the two printed cost halves stay a free player choice (the `Modal`) instead of being
//     pre-filtered to the payable one.
//   - Security cards are face down; "as the top security card" is the top end of the stack.
//
// "your top security card or the bottom face-down card from under any of your Tamers" is one
// printed choice between two costs, which is the BT26-026 shape: a `Modal` with `choose: 1` whose
// two options are the same `CostGatedBlock` body under `trashSecurityTop` and
// `trashBottomFaceDownUnderTamer`. No single `Cost` expresses an either/or, and `compound` would
// wrongly charge both.
//
// The single printed [Once Per Turn] governs both timings, so [When Digivolving] and
// [When Attacking] share one `sharedUseKey` (EX13-012 / EX13-015 shape): using the effect on the
// digivolution turn must also consume the attacking copy.
//
// "1 of your opponent's Digimon can't activate [When Digivolving] effects until their turn ends"
// is `Restrict` / `cannotActivateWhenDigivolving` for `untilOpponentTurnEnd`, exactly as printed
// on BT20-033 and BT23-034 ("their" = the opponent, whose turn ends the lock).
const unsuspendThenLockDigivolving = (cost: Cost): Action => ({
  kind: "CostGatedBlock",
  cost,
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "this Digimon unsuspends",
    },
    {
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      restriction: "cannotActivateWhenDigivolving",
      duration: "untilOpponentTurnEnd",
      raw: "1 of your opponent's Digimon can't activate [When Digivolving] effects until their turn ends",
    },
  ],
});

const unsuspendBody = (): Action[] => [
  {
    kind: "Modal",
    choose: 1,
    options: [
      [
        unsuspendThenLockDigivolving({
          kind: "trashSecurityTop",
          controller: "mine",
          raw: "By trashing your top security card",
        }),
      ],
      [
        unsuspendThenLockDigivolving({
          kind: "trashBottomFaceDownUnderTamer",
          controller: "mine",
          raw: "By trashing the bottom face-down card from under any of your Tamers",
        }),
      ],
    ],
    raw: "By trashing your top security card or the bottom face-down card from under any of your Tamers",
  },
];

// "by placing its top stacked card as the top security card" names the permanent's OWN visible top
// card — the card that would otherwise leave — and promotes the stack beneath it (KB EX11-043
// Q5875/Q5888, prior art BT9-044 / BT17-098 / EX11-041). That is the `place` cost with
// `destination: "security"`, `position: "top"`, `targetIsPermanent: true` and
// `detachPermanentTop: true`; the plain `placeAsSecurity` cost kind (BT26-033) would instead move
// the WHOLE stack out of the battle area, which is the opposite of "it doesn't leave".
// `detachPermanentTop` also makes the interpreter require `hasDigivolutionCards`
// (costs.ts:1773, BT17-098 Q2892), so a stackless Chirinmon simply cannot pay and does leave.
const placeOwnTopAsSecurityCost = (raw: string): Cost => ({
  kind: "place",
  targetIsPermanent: true,
  detachPermanentTop: true,
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  destination: "security",
  position: "top",
  raw,
});

// A `wouldLeavePlay` Replacement whose cost is present with empty payload actions resolves as
// `mode: "prevent"` (EX11-027, EX13-015). No `leaveCause` is printed, so every leave cause —
// battle deletion, effect deletion, return, either player's effects — is covered.
const compiled: CompiledCard = {
  cardId: "EX13-032",
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: unsuspendBody(),
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: unsuspendBody(),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: placeOwnTopAsSecurityCost("by placing its top stacked card as the top security card"),
          raw: "When this Digimon would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave",
        },
      ],
    },
    // Inherited copy: the same prevention, budgeted by the printed [Once Per Turn] (the
    // `frequency` alone enforces it — REVIEW-NOTES: an extra `oncePerTurnKey` is redundant), and
    // gated on the HOST's name. "with [Kentaurosmon] in its name" is the substring name reading
    // (`match: "name"`), so Kentaurosmon and any future w/[Kentaurosmon] card is protected while
    // an unrelated host is not. `match: "name"` reads only the host's name, so the
    // `printedTextOnly` scoping that a `match: "text"` self-gate would need does not apply here.
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "name" }],
          } satisfies Filter,
          actions: [],
          cost: placeOwnTopAsSecurityCost("by placing its top stacked card as the top security card"),
          raw: "When this Digimon with [Kentaurosmon] in its name would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // Printed "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3": a colorless alternate route beside
  // the catalog's Yellow Lv.4 for 3, so a non-Yellow [DATA SQUAD] Lv.4 source is legal too.
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-032", compiled);
