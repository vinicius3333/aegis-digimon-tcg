import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-022 AeroVeedramon (Digimon, Blue, Lv.5 Ultimate [Holy Dragon]/[CS], Vaccine, 7000 DP).
// Printed main text:
//   [Digivolve] Lv.4 w/[CS] trait: Cost 3
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may play 1 Tamer card
//   with [Veedramon] in its text from your hand without paying the cost.
//   [All Turns] [Once Per Turn] When any of your Tamers are played, 1 of your opponent's
//   Digimon or Tamers can't suspend until their turn ends.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When this Digimon with [Veedramon] in its name suspends,
//   it may unsuspend.
//
// --- The alternate [Digivolve] header ---------------------------------------------------------
// A `digivolutionRequirement` entry, not an effect. "w/[CS] trait" is the EXACT trait reading
// (`traits`, never `traitSubstrings`), the shape EX13-019 uses for its own "Lv.3 w/[CS]" header
// and EX12-024 for "w/[NSo]/[VB] trait" — a two-letter token would otherwise match [CS] inside
// unrelated trait strings. Its cost (3) coincides with the catalog EvoCost (Blue Lv.4 cost 3),
// so the alternate's only job is to widen the legal base pool past blue: a BLACK/RED Lv.4 with
// the [CS] trait (BT23-051 Golemon) reaches this card, while a red Lv.4 without [CS] (BT1-014)
// does not, on either route.
//
// --- The three-timing body -------------------------------------------------------------------
// One printed sentence with one printed verb ("play"), so one `PlayWithoutCost` — no Modal,
// unlike EX13-012's "play or use". The difference from EX13-019's otherwise identical clause is
// the payment wording: "without paying the cost" is `payCost: false`, where EX13-019's "with the
// cost reduced by 2" is `payCost: true` + `reduceCostBy: 2`. So no memory moves here at all,
// regardless of the chosen Tamer's printed cost.
//
// "1 Tamer card" is a kind predicate (`kind: ["Tamer"]`), so a Digimon that also prints
// [Veedramon] in its text (EX13-017 Veemon) is refused by kind, not by the token.
//
// "with [Veedramon] in its text" is the substring reading over the whole printed-information
// union (`match: "text"`, comprehensive §4-22-1; the same reading EX13-017/EX13-019 use for this
// exact token), so a Tamer merely NAMED or TRAITED Veedramon would qualify too. It must
// discriminate against the near-miss token "[Vee]": BT2-086 Rina Shinomiya prints "[Vee]" and
// never "Veedramon", so it is NOT a legal choice even though "Vee" is a prefix of "Veedramon".
//
// THREE printed timings share ONE printed [Once Per Turn], so every window carries the same
// `sharedUseKey`: the per-turn ledger keys on `EX13-022/ir-shared-0`, and a [When Digivolving]
// activation spends the [When Attacking] activation of the same turn too (EX13-012, EX12-024).
// Without it each window would keep its own counter and the card would fire three times a turn.
const playVeedramonTamer = (): Action => ({
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controllerDefault: "mine",
      zone: "hand",
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["Veedramon"], match: "text" }],
    },
    count: 1,
  },
  from: ["hand"],
  payCost: false,
  optional: true,
});

const sharedPlayWindow = (trigger: CardEffect["trigger"]): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-0",
  actions: [playVeedramonTamer()],
});

// --- "When any of your Tamers are played" ------------------------------------------------------
// There is no top-level trigger tag for another card's play, so the printed [All Turns] window
// installs a continuous `whenPlayed` SubTrigger watcher — the shape EX13-014 uses for its own
// "[All Turns] [Once Per Turn] When any of your Digimon are played" clause, and BT20-084 for a
// Digimon-play watcher. `sourceFilter` gates the event payload to the controller's own Tamers;
// without it the watcher would fire on every play of any kind (RESEARCH BLK-01 pitfall 2).
//
// "any of your Tamers" has no "other", so `excludeSelf` is deliberately ABSENT — and it would be
// inert anyway, because this card is a Digimon and can never be the played Tamer. The Tamer this
// card's own body plays is "one of your Tamers", so the two clauses chain: playing a Tamer off
// the [On Play] window arms this restriction in the same resolution.
//
// "1 of your opponent's Digimon or Tamers can't suspend until their turn ends" is the BT20-084 /
// BT22-027 encoding verbatim: `Restrict` with `restriction: "suspend"`, `count: 1`,
// `kind: ["Digimon", "Tamer"]`, `controller: "opponent"`, `duration: "untilOpponentTurnEnd"`.
// "their turn" is the restricted player's own turn, which from this controller's seat is the
// opponent's turn. `blocksCombatSuspend` is NOT set: the interpreter records a printed
// `"suspend"` restriction as `beSuspended`, and `ContinuousEffects.hasRestriction` treats the two
// spellings as one prohibition at the read boundary (continuous.ts, "equivalentRestrictions"), so
// both effect-driven suspension and the implicit attack-declaration suspend are already covered.
// The clause is mandatory ("can't suspend", no "you may"), so no `optional`.
const lockOpponentPermanent: Action = {
  kind: "SubTrigger",
  event: "whenPlayed",
  sourceFilter: { controller: "mine", kind: ["Tamer"] },
  actions: [
    {
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
    },
  ],
};

// --- The inherited self-unsuspend -------------------------------------------------------------
// "When this Digimon with [Veedramon] in its name suspends" is a `whenSuspended` SubTrigger whose
// `sourceFilter` gates the suspending permanent (BT23-026's inherited `whenSuspended` clause uses
// the same slot to say "one of your OTHER Digimon"). Here the subject is the carrier itself, so
// `isSelfRef: true` — which, on an inherited entry, binds to the HOST permanent holding this card
// among its digivolution cards, not to this card.
//
// "with [Veedramon] in its name" is the SUBSTRING name reading (`match: "name"`), the same
// reading EX13-017's identically worded inherited clause uses in this set: an UlforceVeedramon
// host qualifies, a Veemon host does not ("Veemon" does not contain "Veedramon"), and a host
// with no Vee token at all does not.
//
// That name gate lives in `hostFilter`, not in `sourceFilter`, on purpose. The whenSuspended
// branch of `registerSubTrigger` reads `sourceFilter.isSelfRef` through a dedicated payload gate
// (`whenSuspendedSelfGate`, subTrigger.ts) that compares the suspended permanent ids to the
// anchor and never consults the filter's other predicates, so a `nameOrTrait` bundled in there
// would be silently inert. `hostFilterGate` runs the full `permanentMatchesFilter` against the
// anchor host, whose `nameOrTrait` reads the host's TOP card — which is exactly "this Digimon".
//
// The body is `Unsuspend` on the same host (`isSelfRef` + `isSelf`) with `optional: true` for the
// printed "it may", the EX12-030 shape minus that card's return cost. `frequency: "OncePerTurn"`
// sits on the effect entry, not on the watcher, so the printed gate covers the whole clause; it
// carries no `sharedUseKey` because no other window shares this [Once Per Turn].
const inheritedUnsuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  hostFilter: { nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    sharedPlayWindow("OnPlay"),
    sharedPlayWindow("WhenDigivolving"),
    sharedPlayWindow("WhenAttacking"),
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [lockOpponentPermanent] },
    { trigger: "AllTurns", frequency: "OncePerTurn", isInherited: true, actions: [inheritedUnsuspend] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-022", compiled);
