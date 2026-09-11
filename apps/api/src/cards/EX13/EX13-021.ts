import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-021 Wingdramon (Blue/Red Lv.5 Ultimate, Vaccine, [Sky Dragon], 7000 DP, play cost 7,
// EvoCost Blue Lv.4 / Red Lv.4 for 4).
//
// Printed main text:
//   [Digivolve] [Coredramon]: Cost 3
//   ＜Jamming＞
//   [On Play] [When Digivolving] trash the bottom 2 digivolution cards of 1 of your opponent's
//     Digimon. Then, 1 of their Digimon or Tamers can't suspend until their turn ends.
//   [All Turns] This Digimon is also treated as Lv.6 [Slayerdramon] for [Examon]'s DNA
//     digivolution.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When this Digimon with [Dracomon] or [Examon] in its text
//     suspends, it may unsuspend.
//
// KB: `node tools/kb/query.mjs card EX13-021` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`: §15-7-1/§15-7-2 (only an explicit "by X, Y"
// optional processing condition gates what follows it — this card's first sentence is a mandatory
// trash with no "by", so the "Then" clause is NOT a payment gate), and the general digivolution
// rules behind the alternate `[Digivolve]` header.
//
// This card is the Blue/Red sibling of BT20-025 Wingdramon, which prints the very same
// "[Digivolve] [Coredramon]: Cost 3" header and the very same "[All Turns] ... also treated as
// Lv.6 [Slayerdramon] for [Examon]'s DNA digivolution" clause; the two GrantStatic actions below
// are that card's accepted shape verbatim (BT20-042 Groundramon carries the [Breakdramon] twin).

// "trash the bottom 2 digivolution cards of 1 of your opponent's Digimon": the dedicated
// TrashDigivolution verb, not a Trash of loose cards — it removes source cards without reverting a
// stage and fires `whenDigivolutionTrashed` with the host as subject.
// `fromTop: false` is what makes it the BOTTOM slice: `runTrashDigivolution`
// (apps/api/src/engine/effects/interpreter/actions/placeUnder.ts) walks `stack` from index 0 —
// bottom-first — when `fromTop` is false, and `stack` holds only the cards beneath the top card.
// The target filter is deliberately unqualified ("1 of your opponent's Digimon", no
// "with digivolution cards"): a source-free Digimon is a legal choice and the mandatory trash then
// simply does as much as it can, matching BT20-042's plain opponent filter. EX11-017 adds
// `digivolutionCards: "hasAny"` only because its own printed text narrows the pool.
const trashBottomTwoSources: Action = {
  kind: "TrashDigivolution",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: 2,
  fromTop: false,
  raw: "trash the bottom 2 digivolution cards of 1 of your opponent's Digimon",
};

// "Then, 1 of their Digimon or Tamers can't suspend until their turn ends." "their" is the
// opponent throughout the clause, so the restriction target is a fresh, independently chosen
// opponent permanent — it need not be the Digimon whose sources were just trashed (BT20-042 proves
// the same two-independent-choices shape for its Suspend/Restrict pair).
//
// A printed "can't suspend" covers BOTH halves of suspension: an effect suspending it and the
// rules suspending it on attack declaration. `restriction: "suspend"` normalizes to the
// effect-facing `beSuspended` in the interpreter, and `blocksCombatSuspend: true` additionally
// records the combat-facing `suspend` prohibition so attack declaration is refused too
// (apps/api/src/engine/effects/interpreter/actions/restrictions.ts). Omitting the flag would leave
// the opponent free to attack with the locked Digimon — the very thing the clause exists to stop.
// BT26-031 and EX11-017 both pair the two for this exact wording.
//
// "until their turn ends" is the OPPONENT's turn end as seen from this card's controller, which is
// the real `EffectDurationRef` `untilOpponentTurnEnd`.
//
// No `condition: { kind: "ifThisEffectActed" }`: per §15-7-2 only an explicit "by X" optional
// processing condition gates the text after "Then", and EX11-017 — whose printed sentence is
// "trash any 3 digivolution cards from your opponent's Digimon. Then, 1 of their Digimon ... can't
// suspend until their turn ends" — is modelled the same way. BT26-031's `ifThisEffectActed` guard
// exists because its first half IS a "By trashing ..." cost.
const suspendLock: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  restriction: "suspend",
  blocksCombatSuspend: true,
  duration: "untilOpponentTurnEnd",
  raw: "1 of their Digimon or Tamers can't suspend until their turn ends",
};

// The two printed timings share no [Once Per Turn], so each window is its own independent effect
// with no `sharedUseKey` (contrast EX13-020, whose three windows share one activation).
const strikeEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [trashBottomTwoSources, suspendLock],
});

// "[All Turns] This Digimon is also treated as Lv.6 [Slayerdramon] for [Examon]'s DNA
// digivolution" is TWO grants, exactly as BT20-025/BT20-042 compile it:
//   * `grant: "name"` with the token, so the [Slayerdramon] material slot of an [Examon] DNA
//     recipe sees this permanent, and
//   * `grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] }`,
//     which confines the level treatment to DNA digivolution into a card named Examon. A bare
//     level grant would wrongly let this card answer any "Lv.6" requirement.
// `zone: "battleArea"` on the self-reference is load-bearing: "This Digimon" is a battle-area
// object, so the alias must not follow the card into hand, trash or breeding.
const selfInBattleArea: Target = {
  filter: { isSelfRef: true, zone: "battleArea" },
  count: 1,
  isSelf: true,
};
const slayerdramonAlias: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: "name",
  tokens: ["Slayerdramon"],
  raw: "This Digimon is also treated as [Slayerdramon]",
};
const examonDnaLevelSix: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
  raw: "This Digimon is also treated as Lv.6 for [Examon]'s DNA digivolution",
};

// Inherited: "[All Turns] [Once Per Turn] When this Digimon with [Dracomon] or [Examon] in its
// text suspends, it may unsuspend."
//
// "When this Digimon ... suspends" is the `whenSuspended` SubTrigger bus, which a real attack
// declaration fires (CombatController.fireSuspended) as well as any effect-driven suspension.
// `sourceFilter.isSelfRef` narrows the board-wide bus to the HOST permanent carrying this card in
// its digivolution stack (`whenSuspendedSelfGate`), which is what "this Digimon" means on an
// inherited effect — EX13-017 gates its inherited Replacement the same way.
//
// "with [Dracomon] or [Examon] in its text" is the HOST's own card information, so it belongs in
// `hostFilter` — the SubTrigger field that re-checks the anchor permanent against a live board
// filter at fire time (`hostFilterGate` runs `permanentMatchesFilter` on the anchor). Putting it in
// `sourceFilter` would be wrong twice over: `sourceFilter` describes the event SUBJECT, and for an
// inherited effect `isSelfRef` resolves against this card's own definition — whose inherited text
// literally contains "[Dracomon] or [Examon]", so the gate would match every host unconditionally.
//
// `match: "text"` is the full card-information union (name ∪ traits ∪ effect text ∪ inherited text
// — matching/definition.ts "text" branch), so a host merely NAMED Dracomon qualifies alongside one
// that only prints the token. Both tokens live in one `nameOrTrait` entry because the entries are
// already OR-matched.
//
// "it may unsuspend" — `optional: true`, targeting the host again. [Once Per Turn] sits on the
// enclosing effect, so the ledger keys per host per turn (EX12-030's identical inherited shape).
//
// `printedTextOnly: true` narrows `match: "text"` to the host's OWN printed information: by
// default a live `match: "text"` ref also folds in a permanent's digivolution-card INHERITED
// text (`permanentMatchesFilter`'s live-text branch, EX1-021 Q3208), which would make any host
// carrying THIS card — whose own inherited line prints "[Dracomon] or [Examon]" — match
// unconditionally. Comprehensive §4-23-2 says a Digimon does not gain a digivolution card's
// text, only its effects, so the printed reading is required here (LM-012's prior art; see also
// EX13-024, which hits the identical trap on a target filter rather than a hostFilter).
const unsuspendHostOnSuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  hostFilter: { nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }], printedTextOnly: true },
  actions: [
    {
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      optional: true,
      raw: "it may unsuspend",
    },
  ],
  raw: "When this Digimon with [Dracomon] or [Examon] in its text suspends, it may unsuspend",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
    },
    strikeEffect("OnPlay"),
    strikeEffect("WhenDigivolving"),
    {
      trigger: "AllTurns",
      actions: [slayerdramonAlias, examonDnaLevelSix],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [unsuspendHostOnSuspend],
    },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] [Coredramon]: Cost 3" is a bracket-only named source with no level and no color,
  // so `namesExact` — the bracketed reference is literal card-name equality, which admits every
  // printing named exactly "Coredramon" (EX13-018, BT20-023, BT20-040, EX3-018, ST1-06) and refuses
  // "Coredramon X"-style relatives. Because it carries no color it is strictly WIDER than the
  // catalog EvoCost on one axis (a green Coredramon reaches this card for 3) and narrower on
  // another (a blue Lv.4 that is not a Coredramon still pays the printed 4).
  digivolutionRequirement: [{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-021", compiled);
