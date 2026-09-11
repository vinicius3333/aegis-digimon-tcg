import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-066 Sistermon Noir (Awakened) / Mickey Bullet (Awakened) — a DUAL card
// (`isDualCard: true`, `kinds: ["Digimon", "Option"]`, White/Black, Lv.4 Champion
// [Puppet] Virus, 6000 DP, play cost 5, NO printed EvoCost (`evoCosts: []`),
// `optionColorRequirements: ["White"]`).
//
// Printed Digimon information:
//   [Digivolve] [Sistermon Noir]/[Sistermon Ciel]: Cost 1
//   [Digivolve] Lv.3 w/[Huckmon] in text: Cost 3
//   ＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞
//   [When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 4 or less.
//   [Rule] Also has Name: [Sistermon Ciel (Awakened)] and Trait: [Data] Attribute.
// No printed inherited text and no printed security text.
//
// Printed Option information ("Mickey Bullet (Awakened)", `optionEffect`):
//   [Main] You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash
//   without paying the cost. Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each
//   of your Digimon.
//
// KB: `node tools/kb/query.mjs card EX13-066` reports no entries — EX13 is pre-release, so
// there are no card-specific rulings. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-5 / §4-5-2 / §4-5-6: a DUAL card is declared as either its Digimon information or its
//     Option information before use; the Option information is the lower text. The engine models
//     that declaration as the `useAs` field on the `playCard` intent, and the Option half of the
//     IR is a plain `trigger: "Main"` effect (the EX12-033 / EX12-052 / BT26-032 DUAL shape).
//   - §16-36-1: ＜Decode＞ reads THAT Digimon's digivolution cards, so the payload pool must be
//     scoped to this permanent's own stack (see `hostFilter` below).
//   - §7-1 / §7-1-1: "playing a card" places one card WITH A PLAY COST onto the field. Option
//     cards are USED, not played, so a kind-less "play 1 ... card" pool excludes Option-only
//     cards — the engine already enforces this in `playableCandidates`
//     (`apps/api/src/engine/effects/interpreter/actions/play.ts`), which drops Option-ONLY
//     candidates from a pool whose IR named no kind while keeping a DUAL card (it has a
//     playable Digimon side). The filter therefore deliberately carries no `kind`, matching the
//     printed "card".
//   - §4-23-1 / §4-23-2: a live Digimon gains its digivolution cards' effects, never their text.

// "[Sistermon Noir]/[Sistermon Ciel]" are bracketed EXACT card-name references, so the
// digivolution header and the ＜Decode＞ payload both use the exact channel
// (`namesExact` on the requirement, `match: "nameExact"` on the filter). A substring reading
// would wrongly admit "Sistermon Ciel (Awakened)" (BT7-083, BT20-084) and even this card's own
// granted alias, which the printed parentheses do not name. `effectiveExactNames` still folds in
// the aliases a card is treated AS — ST12-13 and BT6-084 are treated as [Sistermon Noir] by KB
// Q759/Q1470 — so those remain legal sources without any special casing here.
const sistermonNoirOrCiel = ["Sistermon Noir", "Sistermon Ciel"];

// ＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞ — "when this Digimon would leave the battle area
// other than in battle, you may play 1 of the named cards from its digivolution cards without
// paying the cost". Encoded as the BT19-024 / EX12-035 pair: a `Static` keyword entry so the board
// can read the marker, plus a real `[All Turns]` `Replacement` on `wouldLeavePlay` with
// `leaveCause: "otherThanBattle"` that does the work. ＜Decode＞ has no dedicated combat hook.
//
// `hostFilter: { isSelfRef: true }` states §16-36-1's scope explicitly (EX12-035's shape): the
// `from: ["digivolutionCards"]` pool is documented there as spanning every stack this seat owns.
// Mutation-tested on THIS card: deleting the field leaves the "reads only its OWN stack" proof
// green, because a leave-replacement's play already resolves against the leaving permanent. The
// field is therefore declarative here, not behaviourally provable — it stays because the peer
// shape has it and the pool contract does not guarantee that narrowing. `playedByDecode: true`
// marks the play as a ＜Decode＞ play for the rest of the engine, and `optional: true` carries the
// keyword's "you may" — declining lets the whole stack follow the host into the trash.
const decodePayload: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  hostFilter: { isSelfRef: true },
  nameOrTrait: [{ tokens: sistermonNoirOrCiel, match: "nameExact" }],
};

// "[When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 4 or less."
// Mandatory (no "may"), one target, and the ceiling is the PRINTED PLAY COST of the target —
// `playCostLte`, not `dp` and not `levelComparison`. `definitionMatches` refuses a card whose
// play cost is the `-1` no-cost sentinel even under a numeric comparison, so a Lv.- / costless
// permanent is never reachable by this clause.
const deleteCheapDigimon: Action = {
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 },
    count: 1,
  },
  raw: "Delete 1 of your opponent's Digimon with a play cost of 4 or less.",
};

// "1 play cost 4 or lower card with [Sistermon]" — the token is a partial name ("Sistermon Blanc",
// "Sistermon Ciel", "Sistermon Noir"), never a whole card name, so the reference is the substring
// name channel `match: "name"`; an exact reading would make the clause unsatisfiable by any card
// in the catalog. No `kind` is stated (see the §7-1 note above), and no colour is stated, so the
// filter carries neither.
const sistermonCard: Filter = {
  controller: "mine",
  playCostLte: 4,
  nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      // A `Static` `keywords` entry is NOT decorative in general: `effect.ts` turns it into a
      // self-targeted `GainKeyword` recorded in the continuous ledger, which board readers
      // consult before the printed-text regex fallback. Mutation-tested on THIS card: emptying
      // it leaves the ＜Decode＞ keyword reads green, because `textHasKeyword` parses this card's
      // own printed "＜Decode (...)＞" line correctly. That is card-specific and does not
      // generalize, so the entry stays — the ledger grant is the path that does not depend on
      // printed-text shape.
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Decode", raw: "＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞" }],
    },
    {
      // "[Rule] Also has Name: [Sistermon Ciel (Awakened)] and Trait: [Data] Attribute."
      // Both halves need real IR here. `effectiveNames.ts`'s `[Rule] Name:` parser only accepts
      // the phrasing "[Rule] Name: (Also) treated as ..."; this card's "[Rule] Also has Name:"
      // word order is NOT matched, so the alias is not derived from printed text. Likewise
      // `staticTraitsOf` (`apps/api/src/engine/cards/cardData.ts`) only regex-parses
      // "[Rule] Trait: Has [X]", not "... and Trait: [X] Attribute". Unlike the
      // "[Rule] Trait: Has [X] Type." cards REVIEW-NOTES records, neither grant here is a
      // duplicate of something the printed-text parsers already supply.
      //
      // The name grant is the FULL-identity channel (grant: "name"), matching the printed "Also
      // has Name:" — the card IS also named [Sistermon Ciel (Awakened)], not merely treated as
      // carrying the token inside its name.
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Sistermon Ciel (Awakened)"],
        },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Data"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [deleteCheapDigimon],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: decodePayload, count: 1 },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              raw: "＜Decode ([Sistermon Noir]/[Sistermon Ciel])＞",
            },
          ],
        },
      ],
    },
    {
      // Option information — "Mickey Bullet (Awakened)". A DUAL card's Option half is a plain
      // `trigger: "Main"` effect reached through `playCard` with `useAs: "option"` (EX12-033,
      // EX12-052, BT26-032). Nothing here waives `optionColorRequirements: ["White"]`: the Option
      // side still needs a white card in play, which this card does not print a waiver for.
      trigger: "Main",
      actions: [
        {
          // "You may play 1 ... without paying the cost" from either loose zone: the
          // `from: ["hand", "trash"]` + `payCost: false` play-for-free shape (EX13-013,
          // BT26-073). `optional: true` is the printed "You may".
          kind: "PlayWithoutCost",
          target: { filter: sistermonCard, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          raw: "You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash without paying the cost.",
        },
        {
          // "Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon."
          // A `Scaling` on `DeDigivolve` is a REPETITION count, not one deeper peel
          // (`actions/digivolution.ts`; BT21-061 Q4568 checks board state between peels), which
          // is exactly what "＜De-Digivolve 1＞ for each ..." means. `per: 1` + `unit: "cards"`
          // counts this seat's battle-area Digimon; `countMatching` excludes the breeding area
          // unless the filter names it, which matches "your Digimon" (§3-4-7-7/8).
          //
          // The count is taken when this action resolves, i.e. AFTER the preceding play, so a
          // card played by the first clause counts itself. The sentence is mandatory and the
          // preceding clause is a separate "you may", so declining the play still runs this.
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
          raw: "Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for each of your Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // Both headers are `isAlternate: true`: the catalog carries NO printed EvoCost for this card
  // (`evoCosts: []`), so every legal digivolution route is one of these two named paths. The
  // exact-name route is listed first so it wins (and charges the cheaper 1 memory) for a base
  // that could somehow answer both; `matchGatedRequirement` returns the first match.
  //
  // The first header prints no level at all, so the entry carries none — a [Sistermon Ciel] of
  // any level is a legal source. The second fixes `level: 3` and gates on "[Huckmon] in text",
  // which `matchGatedRequirement` evaluates over the base's full printed-information union
  // (name ∪ traits ∪ every text field, EX12-051 Q6829) — so the Lv.3 Digimon NAMED Huckmon
  // (EX13-009) qualifies even with no occurrence of the token in its effect text.
  digivolutionRequirement: [
    { namesExact: sistermonNoirOrCiel, cost: 1, isAlternate: true },
    { level: 3, texts: ["Huckmon"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX13-066", compiled);
