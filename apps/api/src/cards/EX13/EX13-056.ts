import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-056 Giromon (Digimon, Black, Lv.5 Ultimate [Mine], Vaccine, 7000 DP, play cost 7).
// Single catalog EvoCost: Black Lv.4 for 3. No [Digivolve] header is printed, so the card carries
// no `digivolutionRequirement` — the catalog route is the only route.
//
// Printed main text:
//   ＜Collision＞
//   ＜Blocker＞
//   [All Turns] [Once Per Turn] When this Digimon suspends, reveal the top 3 cards of your deck.
//     You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying
//     the cost. Trash the rest.
//   [Rule] Trait: Has [Machine] Type.
// Printed inherited text:
//   [Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, you may play 1 level 5 or
//     lower black Digimon card with ＜Blocker＞ from your hand without paying the cost.
// No security effect is printed.
//
// KB: `node tools/kb/query.mjs card EX13-056` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §16-30 ＜Collision＞: while the Digimon with it is attacking, ALL of the opponent's Digimon
//     gain ＜Blocker＞ and the opponent is forced to block whenever possible. It is a persistent
//     effect, fully engine-resident (`hasCollision`, `combat/controller.ts:908/1045`), so the IR
//     only declares the keyword.
//   - §16-4 / §11-4 / §12-1 ＜Blocker＞: also engine-resident, read from the continuous keyword
//     ledger by `combat/legality.ts` with a printed-text regex fallback.
//   - §8-8 "without paying the cost": the play is fully free, not a reduction — so the reveal slot
//     carries no `costDelta` and the hand play carries `payCost: false` with no `reduceCostBy`.
//   - §2-3-2-3 / §2-3-2-4 traits, and the [Rule] Trait clause: `staticTraitsOf`
//     (`engine/cards/cardData.ts:299`) parses `[Rule] Trait: Has [X] Type.` straight out of
//     `effectText`, so [Machine] is live from printed text alone.
//   - §4-23-1 / §4-23-2: a Digimon gains its digivolution cards' EFFECTS, never their text — which
//     is why nothing here filters on `match: "text"` and no `printedTextOnly` narrowing is needed.

// "1 level 4 or lower black Digimon card with ＜Blocker＞" — the main clause's reveal slot, and
// "1 level 5 or lower black Digimon card with ＜Blocker＞" — the inherited clause's hand slot. The
// only difference between the two printed sentences is the level ceiling, so one builder covers
// both.
//
// `levelComparison: { op: "lte" }` is the "level N or lower" shape BT17-058 uses for this exact
// printed phrase over a revealed black Digimon; `colors: ["Black"]` is "black" (the OR-matched
// form, so a multicolour card that includes black still qualifies, per §2-3-1); `kind: ["Digimon"]`
// is "Digimon card", which refuses a black Tamer or Option regardless of the rest.
//
// `keywords: ["Blocker"]` is the keyword predicate (EX13-051's `sourceFilter` uses the same entry
// for the identically printed "with ＜Blocker＞"). `definitionHasKeyword`
// (`interpreter/matching/definition.ts:265`) answers it from the card definition, so it works on
// cards still in the deck and in hand, where there is no live permanent to read a granted keyword
// from. That is the correct reading for a card in a private zone: a deck/hand card has no granted
// keywords, only printed ones.
const blackBlockerDigimon = (maxLevel: number, zone?: "hand"): Filter => ({
  controllerDefault: "mine",
  ...(zone === undefined ? {} : { zone }),
  kind: ["Digimon"],
  colors: ["Black"],
  levelComparison: { op: "lte", value: maxLevel },
  keywords: ["Blocker"],
});

// "When this Digimon suspends" is the host-scoped form of the board-wide `whenSuspended` bus, spelt
// `sourceFilter: { isSelfRef: true }` — EX13-040 and P-093 print the identical sentence. The bus
// fires for every cause of a suspension: an effect, a paid cost, a ＜Blocker＞ block, and the attack
// declaration itself (`combat/controller.ts` `openWhenSuspendedWindow`).
//
// `isSelfRef` is deliberately the ONLY predicate in this `sourceFilter`. The `whenSuspended` branch
// of `registerSubTrigger` reads it through a dedicated payload gate (`whenSuspendedSelfGate`,
// `interpreter/actions/subTrigger.ts:461`) that compares suspended-permanent ids to the anchor and
// never evaluates the rest of the filter — so any extra predicate bundled in here would be silently
// inert. There is nothing else to gate on ("this Digimon" is the whole subject), so the host-scoped
// form is safe as written.
//
// The body is `RevealAdd` with one `add` slot: `revealCount: 3` for "reveal the top 3 cards of your
// deck", `to: "play"` with `optional: true` for "You may play 1 ... without paying the cost"
// (EX13-028's shape for this same printed sentence), and `rest: "trash"` for "Trash the rest".
// No `costDelta`: "without paying the cost" is the full waiver, not a reduction.
const revealAndFreePlayOnSelfSuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  actions: [
    {
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ filter: blackBlockerDigimon(4), count: 1, to: "play", optional: true }],
      rest: "trash",
      raw: "reveal the top 3 cards of your deck. You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying the cost. Trash the rest",
    },
  ],
  raw: "When this Digimon suspends, reveal the top 3 cards of your deck. You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying the cost. Trash the rest",
};

// The inherited clause's subject is "any of your Digimon", not "this Digimon", so its `sourceFilter`
// is the board filter `{ controller: "mine", kind: ["Digimon"] }` with NO `isSelfRef` — EX13-044 and
// EX13-051 both print this subject and encode it this way. Without `isSelfRef` the generic subject
// gate (`subjectMatchesFilter`) evaluates the whole filter, which is what this clause needs; with it
// the self-gate above would fire only for the host.
//
// The body is `PlayWithoutCost` from hand (EX13-022's shape): `from: ["hand"]` +
// `zone: "hand"` on the target filter for "from your hand", `payCost: false` for "without paying the
// cost", and `optional: true` for the printed "you may".
const playBlackBlockerFromHandOnAllySuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: blackBlockerDigimon(5, "hand"), count: 1 },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, you may play 1 level 5 or lower black Digimon card with ＜Blocker＞ from your hand without paying the cost",
};

// Each printed clause carries its OWN [Once Per Turn], so each `CardEffect` takes its own
// `frequency` and neither takes a `sharedUseKey`: pooling them would let the main copy starve the
// inherited one in the same turn. `withSubTriggerFrequency` turns the effect's `frequency` into the
// installed watcher's per-turn ledger key, so no extra `oncePerTurnKey` is needed.
//
// The printed timing windows differ and are load-bearing: the main clause is [All Turns], while the
// inherited clause is [Opponent's Turn]. `withSubTriggerTurnScope` (`effect.ts:420`) carries the
// latter onto the watcher as `turnScope: "opponentsTurn"`, so an ally suspending on the controller's
// own turn (declaring an attack, say) does not wake the inherited clause — only the main one.
const mainSuspendClause: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [revealAndFreePlayOnSelfSuspend],
};

const inheritedSuspendClause: CardEffect = {
  trigger: "OpponentsTurn",
  isInherited: true,
  frequency: "OncePerTurn",
  actions: [playBlackBlockerFromHandOnAllySuspend],
};

const compiled: CompiledCard = {
  cardId: "EX13-056",
  effects: [
    {
      // Both keywords are engine-resident. The `Static` entry is still kept rather than relying on
      // the printed-text regex fallback: per the coordinator's EX13 notes a `Static` `keywords`
      // entry is NOT decorative — `effect.ts` turns it into a self-targeted `GainKeyword` that
      // grants the keyword through the continuous ledger, and `combat/legality.ts` consults that
      // ledger FIRST, only falling back to regex-parsing `effectText`. Keeping the entry is what
      // makes `observe().hasKeyword` and the forced-block path read the same source of truth.
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    mainSuspendClause,
    {
      // "[Rule] Trait: Has [Machine] Type." The catalog prints only [Mine], so this clause is the
      // sole source of [Machine] on the card. The entry is the EX13-038 / EX12-026 / ST18-12 shape
      // (a `Rule`-trigger `GrantStatic` with `grant: "trait"` on `isSelfRef`) and is DECLARATIVE,
      // not load-bearing: `staticTraitsOf` already parses the printed line out of `effectText`, so
      // [Machine] is live with or without it (mutation-confirmed — deleting this effect leaves the
      // trait tests green). It is kept so the IR record of the printed clause stays complete.
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Machine"],
          raw: "[Rule] Trait: Has [Machine] Type.",
        },
      ],
    },
    inheritedSuspendClause,
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-056", compiled);
