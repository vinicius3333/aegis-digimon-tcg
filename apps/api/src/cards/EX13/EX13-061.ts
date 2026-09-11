import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-061 Gankoomon (Digimon, Black/White, Lv.6 Mega [Holy Warrior]/[Royal Knight], Data,
// 12000 DP, play cost 12, printed EvoCost Black Lv.5 for 5).
//
// Printed main text:
//   [Digivolve] Lv.5 w/[Huckmon] in text: Cost 4
//   [Assembly -5] 3 [Huckmon] text Digimon cards w/different names
//   ＜Reboot＞
//   ＜Blocker＞
//   [On Play] [When Digivolving] You may play 1 [Hinukamuy] Token.
//     (Digimon/White/6000 DP/＜Alliance＞ ＜Reboot＞ ＜Blocker＞) Then, until your opponent's turn
//     ends, their Digimon effects don't affect 1 of your white Digimon.
//   [All Turns] [Once Per Turn] When any of your white Digimon suspend, you may use 1 use cost 5
//     or lower Option card with [Huckmon] in its text from your hand or this Digimon's
//     digivolution cards without paying the cost.
// No printed inherited text and no printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-061` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-2 / §7-3-2-6: Assembly materials come from the TRASH, reduce the play cost by
//     the flat printed amount, and are stacked under the played card in the header's reading
//     order. This header lists ONE slot of three cards, so no per-slot level is fixed.
//   - §16-4 (＜Blocker＞) and §16-11 (＜Reboot＞): engine-resident, so the IR only declares them.
//   - §4-22-1 / §4-23-1 / §4-23-2: "X in its text" is the token anywhere in a card's printed
//     information; a Digimon gains its digivolution cards' EFFECTS, never their text.
//   - §9-4: "don't affect" is the unaffected/immunity wording — the permanent can neither be
//     chosen by nor affected by the named source class of effects.
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect, and is the
// same shape as its EX13-014 Jesmon sibling in this set — only the cost differs (4, not 3). It is
// strictly WIDER than the catalog EvoCost in one direction (any Lv.5 carrying the token, colour
// irrelevant) and CHEAPER than it (4 vs 5), which makes the two routes behaviourally separable
// here in a way they are not on EX13-014: a red Lv.5 [Huckmon]-text base pays 4 and a black Lv.5
// WITHOUT the token pays 5.
//
// [Assembly -5] reads "3 [Huckmon] text Digimon cards w/different names" — a single slot of
// `count: 3` with `differentNames: true` (EX12-060 / EX12-076 shape), NOT three ordered per-level
// slots. The header names no level at all, so three same-level materials are legal; this is the
// deliberate structural difference from EX13-014's "Lv.5 × Lv.4 × Lv.3" header, which does fix a
// level per slot. `kinds: ["Digimon"]` carries the printed "Digimon cards", which excludes an
// Option that happens to print the token.

// "Option card with [Huckmon] in its text", capped at "use cost 5 or lower". `match: "text"` is
// the printed-information union (§4-22-1), so an Option whose NAME lacks the token but whose
// effect text prints it still qualifies. No `printedTextOnly` is needed or wanted: the pool is
// CARDS in the hand and in a digivolution stack, not live permanents, so there is no inherited
// stack text to over-read (the seam REVIEW-NOTES records for live `match: "text"` refs).
// `playCostLte: 5` spells the printed cap out rather than relying on the action's historical
// default of 5 (EX8-037). The clause names no colour, so the filter carries none — a red or black
// [Huckmon] Option both qualify.
const huckmonOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

// "from your hand or this Digimon's digivolution cards without paying the cost" is the EX12-034 /
// EX13-014 pool: `from: ["hand", "digivolutionCards"]` plus `target.source: "thisDigimon"`, which
// narrows ONLY the hosted zone to the resolving source's own stack while leaving the hand pool
// intact — a bare `from: ["digivolutionCards"]` would span every stack this seat owns.
// `payCost: false` is "without paying the cost"; `optional: true` is the printed "you may".
//
// The clause waives the COST only. It does NOT waive the Option's own colour requirement, and the
// action deliberately carries no `waiveColorRequirement`: `optionUseCandidates`
// (`apps/api/src/engine/effects/interpreter/actions/borrowed.ts`) keeps enforcing
// `optionColorRequirementMet`. On this Black/White host that is load-bearing — a RED [Huckmon]
// Option needs a red permanent in play before this window can reach it, while the white BT23-099
// is reachable off the host alone. `allowMultiColor` is likewise absent: a multicoloured Option is
// not a legal target of a plain "1 Option card" use.
const useHuckmonOption: Action = {
  kind: "UseOptionWithoutCost",
  filter: huckmonOption,
  target: { filter: huckmonOption, count: 1, source: "thisDigimon" },
  from: ["hand", "digivolutionCards"],
  payCost: false,
  optional: true,
  raw: "you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost",
};

// "You may play 1 [Hinukamuy] Token. (Digimon/White/6000 DP/＜Alliance＞ ＜Reboot＞ ＜Blocker＞)"
// The parenthetical is the token's printed stat line, and the engine already carries exactly that
// synthetic definition as `TOKEN-Hinukamuy-Token` (`packages/shared/src/cards/tokens.ts`:
// White, 6000 DP, no level, `＜Alliance＞ ＜Reboot＞ ＜Blocker＞`) — the same registry entry
// BT23-057 names. Passing the bare registry name lets `resolveTokenCardId` resolve it instead of
// minting a second, divergent inline `TokenSpec`.
//
// Unlike EX13-014's token half there is NO "if you don't have ..." gate printed here, so the
// action carries no `condition`: a second Hinukamuy Token is legal while the first is still out.
const playHinukamuyToken: Action = {
  kind: "PlayToken",
  tokens: ["Hinukamuy Token"],
  count: 1,
  payCost: false,
  optional: true,
  raw: "You may play 1 [Hinukamuy] Token.",
};

// "Then, until your opponent's turn ends, their Digimon effects don't affect 1 of your white
// Digimon." This is the EX12-019 encoding of the identical printed phrase: a `Restrict` with
// `restriction: "beAffected"` narrowed by `fromSourceKind: ["Digimon"]` and
// `byOpponentEffectsOnly: true`. The sibling `GrantImmunity` action is deliberately NOT used — its
// `immuneFrom: "opponentEffects"` blocks EVERY opponent effect, Options and Tamers included, which
// is wider than "their DIGIMON effects".
//
// `duration: "untilOpponentTurnEnd"` is the printed "until your opponent's turn ends" and is a
// real `EffectDurationRef` (an unrecognised duration string silently expires at the next turn end).
//
// The sentence is mandatory and carries no "if this effect played a token", so the immunity
// resolves even when the token half is declined, and its recipient is freshly chosen from the
// controller's white Digimon — it is not bound to the token. `colors: ["White"]` is the OR-matched
// printed-colour predicate, so this card's own Black/White host qualifies as readily as the
// mono-white token.
const immuneWhiteDigimon: Action = {
  kind: "Restrict",
  target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["White"] }, count: 1 },
  restriction: "beAffected",
  fromSourceKind: ["Digimon"],
  byOpponentEffectsOnly: true,
  duration: "untilOpponentTurnEnd",
  raw: "until your opponent's turn ends, their Digimon effects don't affect 1 of your white Digimon",
};

// The two printed timings share ONE printed line with no [Once Per Turn] on it, so each window is
// its own effect with neither `frequency` nor `sharedUseKey` (EX13-044's identical header shape).
const tokenWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [playHinukamuyToken, immuneWhiteDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      // `effect.ts` turns a `Static` `keywords` entry into a self-targeted `GainKeyword` recorded
      // in the continuous ledger, and combat legality (`hasBlocker` in `combat/legality.ts`) reads
      // that ledger BEFORE falling back to regex-parsing `effectText` (`hasPrintedKeyword`).
      // Mutation-tested on THIS card: emptying `keywords` leaves every behavioural keyword test
      // green, because the regex fallback parses this card's printed "＜Reboot＞" / "＜Blocker＞"
      // lines correctly. That is card-specific and does not generalize, so the entry stays —
      // peers declare it, and the ledger grant is the path that does not depend on text shape.
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    tokenWindow("OnPlay"),
    tokenWindow("WhenDigivolving"),
    {
      // "When any of your white Digimon suspend" is the board-wide `whenSuspended` bus narrowed by
      // `sourceFilter` to this seat's own WHITE Digimon. It is deliberately NOT `isSelfRef`:
      // "any of your white Digimon" includes every ally (the Hinukamuy Token this card makes, most
      // obviously), and the bus fires for every suspension cause — an effect, a paid cost and the
      // attack declaration itself.
      //
      // Leaving `isSelfRef` off also avoids a live footgun REVIEW-NOTES records: the whenSuspended
      // branch of `registerSubTrigger` reads `sourceFilter.isSelfRef` through a dedicated payload
      // gate (`whenSuspendedSelfGate`) that ignores the filter's OTHER predicates, so a self-ref
      // watcher would silently drop the `colors` narrowing this clause depends on. Without it the
      // generic subject gate (`subjectMatchesFilter`) evaluates the whole filter.
      //
      // The line prints its own [Once Per Turn], so it carries `frequency: "OncePerTurn"` and no
      // `sharedUseKey`: nothing else on this card shares that budget.
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["White"] },
          actions: [useHuckmonOption],
          raw: "When any of your white Digimon suspend, you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 3,
          kinds: ["Digimon"],
          nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
          differentNames: true,
        },
      ],
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-061", compiled);
