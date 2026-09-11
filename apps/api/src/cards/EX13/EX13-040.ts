import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Mikemon (EX13-040), green Lv.4 Data Beast Champion. Three printed clauses:
//   [On Play] [When Digivolving] 1 of your opponent's Digimon or Tamers can't unsuspend until
//     their turn ends.
//   [All Turns] When this Digimon suspends, suspend 1 of your opponent's Digimon or Tamers.
//   (inherited) [All Turns] All of your suspended Digimon get +1000 DP.
//
// The card prints no [Digivolve] line, so it carries no `digivolutionRequirement`: the only legal
// route is the catalog `evoCosts` entry (green Lv.3, cost 2).

// "1 of your opponent's Digimon or Tamers" is a single mandatory choice over the union of both
// permanent kinds on the opponent's board — the same Target every prior printing of this sentence
// uses (EX12-063, BT26-042/044, EX9-044).
const opponentDigimonOrTamer = {
  filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
  count: 1,
} satisfies Target;

// "can't unsuspend until their turn ends" — `restriction: "unsuspend"` with
// `duration: "untilOpponentTurnEnd"`, so the lock survives the opponent's unsuspend phase and
// lapses at the end of that turn. Unlike every earlier printing of the sentence, Mikemon does NOT
// suspend anything first, so there is no preceding `Suspend` action: an already-unsuspended target
// is a legal (if inert until it suspends) choice, exactly as printed.
const lockUnsuspend = {
  kind: "Restrict",
  target: opponentDigimonOrTamer,
  restriction: "unsuspend",
  duration: "untilOpponentTurnEnd",
} satisfies Action;

// "When this Digimon suspends" is the host-scoped form of the board-wide `whenSuspended` bus, which
// the IR spells `sourceFilter: { isSelfRef: true }` (P-093 prints the identical sentence). The bus
// fires for every suspension cause — an effect, a cost, and the attack declaration itself
// (combat/controller.ts `openWhenSuspendedWindow`). No `[Once Per Turn]` is printed, so the effect
// carries no `frequency`, and nothing here suspends the host, so it cannot re-trigger itself.
const suspendOnSelfSuspend = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  actions: [{ kind: "Suspend", target: opponentDigimonOrTamer }],
} satisfies Action;

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [lockUnsuspend] },
    { trigger: "WhenDigivolving", actions: [lockUnsuspend] },
    { trigger: "AllTurns", actions: [suspendOnSelfSuspend] },
    {
      // "All of your suspended Digimon" is a continuous aura over a live board predicate, not a
      // one-shot buff, so it uses the dedicated `Aura` primitive (no `duration`: it holds while the
      // source exists). `count: "all"` over a `suspended: true` filter is re-derived on every
      // continuous pass (CR-01), so the +1000 DP follows each Digimon in and out of suspension.
      // Same encoding EX13-038 uses for this identical printed sentence. "your" is the host
      // controller's seat (`controller: "mine"`), and no "other" is printed, so a suspended host is
      // boosted too.
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], suspended: true },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: "All of your suspended Digimon get +1000 DP",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-040", compiled);
