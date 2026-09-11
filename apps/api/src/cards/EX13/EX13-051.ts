import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-051 Guardromon (Black Lv.4 Champion, [Mine] type, Virus, 5000 DP, play cost 4,
// printed EvoCost: Black Lv.3 for 2).
//
// Printed clauses:
//   ＜Blocker＞
//   [All Turns] When any of your other Digimon with ＜Blocker＞ would leave the battle area
//     other than by your effects, by suspending this Digimon, they don't leave.
//   Inherited: [Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, this Digimon
//     may unsuspend.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §16-5 ＜Blocker＞ / §12-1 Blocking: a persistent keyword letting the non-turn player switch
//     an attack onto this Digimon, which suspends it. The keyword is read straight off printed
//     text by `combat/keywords.ts`; the `Static` entry only keeps the IR record complete, the way
//     EX13-015 and EX12-060 do.
//   - §15-7 Optional Processing Conditions: a "by <cost>, ..." clause only performs the processing
//     after the condition when the player chooses the cost AND pays it successfully — so declining
//     leaves the removal to resolve, and an unpayable cost (a host that is ALREADY suspended)
//     never opens the window at all.
//   - "other than by your effects" excludes only the controller's own effects, which is exactly
//     `leaveCause: "otherThanYourEffect"` (AD1-003, EX13-015); a battle or an opponent's effect
//     both still reach the watcher.
//
// The watched set is a BOARD filter, not `isSelfRef`: "any of your other Digimon with ＜Blocker＞".
//   - `controller: "mine"` is the printed "your" — `runReplacement`'s non-self `protects` path
//     checks the leaving permanent's seat against the reaction's owner before running the filter.
//   - `keywords: ["Blocker"]` is the printed keyword gate. On a live permanent
//     (`matching/permanent.ts`) this reads GRANTED keywords too, not only printed ones, which is
//     the correct reading: a Digimon that gained ＜Blocker＞ from another effect is "a Digimon
//     with ＜Blocker＞" (cf. the same filter on BT2-101's Unsuspend).
//   - `excludeSelf: true` is the printed "other": Guardromon itself carries ＜Blocker＞ and would
//     otherwise match its own watcher. It cannot save itself — and the cost (suspending itself)
//     would not have saved it anyway, so the exclusion is load-bearing only for the NEGATIVE:
//     without it the host pays to save itself, which the printed "other" forbids.
// "they don't leave" is plural, so `affectsAll: true` with `target.count: "all"` saves every
// matching Digimon named in the same leave (EX12-072, EX13-043, Q4319).
// No [Once Per Turn] is printed on this clause, so it carries NO `frequency`: it may fire again
// and again in one turn, bounded only by the host being unsuspended enough times to pay.
const otherBlockers: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  keywords: ["Blocker"],
  excludeSelf: true,
};

const preventOtherBlockerLeaving: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  leaveCause: "otherThanYourEffect",
  optional: true,
  affectsAll: true,
  sourceFilter: otherBlockers,
  target: { filter: otherBlockers, count: "all" },
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Digimon",
  },
  raw: "When any of your other Digimon with ＜Blocker＞ would leave the battle area other than by your effects, by suspending this Digimon, they don't leave",
};

// The inherited clause prints the same sentence as AD1-014's main-text version ("When any of your
// Digimon suspend, this Digimon may unsuspend"), so it reuses that shape: a `whenSuspended`
// SubTrigger whose `sourceFilter` is the board set "your Digimon" and whose payload unsuspends the
// HOST ("this Digimon" = the permanent carrying this card, `isSelf` + `isSelfRef`).
//
// Deliberately NOT `sourceFilter: { isSelfRef: true }`: the printed subject is "any of your
// Digimon", and a bundled-self gate on a `whenSuspended` watcher would hit the dedicated
// `whenSuspendedSelfGate` payload comparison (subTrigger.ts:461), which ignores the rest of the
// filter. The board filter here is evaluated in full.
//
// `trigger: "OpponentsTurn"` is the printed window; `withSubTriggerTurnScope` (effect.ts:420)
// carries it onto the installed watcher as `turnScope: "opponentsTurn"`, so a suspension on the
// controller's OWN turn (declaring an attack, say) does not wake it. `frequency: "OncePerTurn"` is
// the printed [Once Per Turn]; `withSubTriggerFrequency` turns it into the watcher's per-turn
// ledger key, so no extra `oncePerTurnKey` is needed. "may" is the `optional: true` prompt.
const mayUnsuspendWhenAnyOfYoursSuspends: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, this Digimon may unsuspend",
};

const compiled: CompiledCard = {
  cardId: "EX13-051",
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    { trigger: "AllTurns", actions: [preventOtherBlockerLeaving] },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [mayUnsuspendWhenAnyOfYoursSuspends],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-051", compiled);
