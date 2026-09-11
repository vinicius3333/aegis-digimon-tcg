import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-044 Breakdramon (Digimon, Green/Red, Lv.6 Mega [Machine Dragon], Virus, 12000 DP,
// play cost 12, printed EvoCosts Green Lv.5 for 4 and Red Lv.5 for 4).
//
// Printed main text:
//   [Digivolve] [Groundramon]/[Wingdramon]: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Dracomon]/[Examon] in text
//   ＜Piercing＞
//   ＜Blocker＞
//   [On Play] [When Digivolving] You may suspend up to 2 Digimon or Tamers. Then, 2 of your
//     opponent's Digimon or Tamers can't unsuspend until their turn ends.
//   [All Turns] [Once Per Turn] When any of your Digimon suspend, 1 of your Digimon with
//     [Dracomon] or [Examon] in its text may battle 1 of your opponent's Digimon.
// Printed inherited text: the same [All Turns] [Once Per Turn] battle clause.
// No printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-044` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings to lean on. The general rules consulted in
// `data/kb/rules/comprehensive.md` are:
//   - §7-3 / §7-3-2 / §7-3-2-6: Assembly materials come from the trash, reduce the play cost by
//     the flat printed amount, and are stacked in the header's left-to-right order.
//   - §16-4 (＜Blocker＞) and §16-5 (＜Piercing＞): both engine-resident, so the IR only declares
//     the keywords.
//   - §4-22-1 / §4-23-1 / §4-23-2: "X in its text" is the token anywhere in a card's printed
//     information, and a Digimon does NOT gain its digivolution cards' TEXT (only their effects).
//   - §14: a "may battle" is a direct DP comparison, not an attack declaration.
// The two header lines are printed identically on EX13-024 Slayerdramon in this same set, so the
// `digivolutionRequirement` / `assemblyRequirement` entries below are deliberately identical to
// that card's — same reading, same shape.

// "1 of your Digimon with [Dracomon] or [Examon] in its text". `match: "text"` is the printed-
// information union (§4-22-1): the token anywhere in the card's name, traits, effect text,
// inherited text, (Rule) lines or requirement headers — so a Digimon that only mentions the token
// in an effect qualifies, while a near-miss name such as Monodramon does not.
//
// `printedTextOnly: true` is the deliberate narrowing, and the same seam EX13-024 documents for
// this exact printed phrase: by default a live `match: "text"` ref also reads a permanent's
// digivolution-card inherited text (`permanentMatchesFilter`'s live-text branch, EX1-021 Q3208),
// which would make any Digimon merely CARRYING this card in its stack a "[Dracomon] or [Examon]
// text Digimon". §4-23-2 says the opposite in as many words. This card's own printed text carries
// both tokens (the Assembly header and this very clause), so the host itself always matches — by
// its own printed information, which is correct.
const dracomonOrExamonText: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

// "You may suspend up to 2 Digimon or Tamers." No "your" and no "your opponent's", so the pool is
// BOTH seats' permanents (`controllerDefault: "any"`) — the BT25-059 / BT9-069 encoding of this
// same printed sentence, widened from its "Digimon" to this card's "Digimon or Tamers".
// "up to 2" is `count: 2` + `upTo: true`; "You may" is the clause's optionality (`optional: true`),
// so declining suspends nothing and still reaches the mandatory second sentence.
const suspendUpToTwo: Action = {
  kind: "Suspend",
  target: {
    filter: { controllerDefault: "any", kind: ["Digimon", "Tamer"] },
    count: 2,
    upTo: true,
  },
  optional: true,
  raw: "You may suspend up to 2 Digimon or Tamers",
};

// "Then, 2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends."
// `restriction: "unsuspend"` is the WHOLE-TURN lock — any effect, any phase — which is what a bare
// "can't unsuspend until their turn ends" says; the narrower
// `unsuspendDuringOwnUnsuspendPhase` would leave effect-driven unsuspends legal and is for the
// "during their next unsuspend phase" wording instead. `duration: "untilOpponentTurnEnd"` makes the
// lock survive the opponent's unsuspend phase and lapse at the end of that turn (EX13-040,
// EX12-063, BT26-042/044 all print this sentence with `count: 1`; only the count differs here).
//
// The sentence is mandatory ("can't unsuspend", no "you may") and is NOT conditional on the
// optional suspend having happened — there is no "if", so the lock resolves even on a full decline,
// and it deliberately carries no binding to the suspended permanents: the two locked permanents are
// freshly chosen from the opponent's board, suspended or not.
const lockTwoOpponentPermanents: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
  restriction: "unsuspend",
  duration: "untilOpponentTurnEnd",
  raw: "2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends",
};

// The two printed timings each print their own activation and the line carries no [Once Per Turn],
// so neither window takes a `frequency` or a `sharedUseKey`.
const suspendWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendUpToTwo, lockTwoOpponentPermanents],
});

// "When any of your Digimon suspend" is the board-wide `whenSuspended` bus narrowed by
// `sourceFilter` to the controller's own Digimon (BT2-032's "one of your blue Tamers", BT2-079 and
// BT4-084 for the opponent-side direction). It is deliberately NOT `isSelfRef`: "any of your
// Digimon" includes every ally, and the bus fires for every suspension cause — an effect, a paid
// cost, and the attack declaration itself (combat/controller.ts `openWhenSuspendedWindow`).
//
// The `sourceFilter` here carries no `isSelfRef`, which matters: the whenSuspended branch of
// `registerSubTrigger` reads `sourceFilter.isSelfRef` through a dedicated payload gate
// (`whenSuspendedSelfGate`) that ignores the filter's other predicates, so a self-ref watcher with
// extra predicates would silently drop them. Without `isSelfRef` the generic subject gate
// (`subjectMatchesFilter`) evaluates the whole filter, which is what this clause needs.
//
// "1 of your Digimon with [Dracomon] or [Examon] in its text MAY battle 1 of your opponent's
// Digimon" is the `Battle` primitive (BT26-047, EX12-052): a direct §14 DP comparison where the
// loser — or both on a tie — is deleted, with no attack declaration, no security check and no
// suspension of the attacker. `optional: true` carries the printed "may". The attacker pool is the
// [Dracomon]/[Examon]-text filter above; the chosen battler need not be the Digimon that suspended.
const battleOnAllySuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "Battle",
      attacker: { filter: dracomonOrExamonText, count: 1 },
      defender: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } satisfies Target,
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, 1 of your Digimon with [Dracomon] or [Examon] in its text may battle 1 of your opponent's Digimon",
};

// The clause is printed TWICE — once as main text and once as inherited text — each with its own
// [Once Per Turn]. They are separate printed instances, so each effect carries its own `frequency`
// and no `sharedUseKey`: pooling them would let the main copy starve the inherited one on the same
// turn (the same call EX13-024 makes for its twice-printed leave prevention).
const battleClause = (isInherited: boolean): CardEffect => ({
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  ...(isInherited ? { isInherited: true } : {}),
  actions: [battleOnAllySuspend],
});

export const compiled: CompiledCard = {
  effects: [
    {
      // Both keyword entries are for record completeness, not behaviour: `printedKeywordsOf`
      // (`apps/api/src/engine/combat/keywords.ts`) parses ＜Blocker＞ and ＜Piercing＞ straight out
      // of `effectText`, so combat already honours them with no IR at all (mutation-confirmed:
      // deleting either entry leaves the block and the piercing security check green; only
      // `observe().hasPierce`, which reads the IR, notices). Peers declare them anyway, so this does.
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    suspendWindow("OnPlay"),
    suspendWindow("WhenDigivolving"),
    battleClause(false),
    battleClause(true),
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] [Groundramon]/[Wingdramon]: Cost 3" is a bracket-only named source, so
  // `namesExact` — a substring `names` match would also admit unrelated [Dramon]-named relatives.
  // The header carries no level and no color, making it strictly wider than the two catalog
  // EvoCosts (Green Lv.5 / Red Lv.5 for 4): a mono-BLUE Wingdramon (EX3-020) reaches this card for
  // 3 even though blue is not one of its colors. The exact-vs-substring choice is not
  // behaviourally provable for these two tokens: no card in the catalog carries "Groundramon" or
  // "Wingdramon" as a PROPER substring of its name, so `names` and `namesExact` admit the same
  // pool today. The structural assertion in the test records the reading; the report says so.
  digivolutionRequirement: [{ namesExact: ["Groundramon", "Wingdramon"], cost: 3, isAlternate: true }],
  // "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Dracomon]/[Examon] in text" lists three ordered
  // single-card slots, each of which must satisfy the text gate on its own. The level is the only
  // thing that differs between slots, so this is three `count: 1` entries at levels 5, 4 and 3
  // rather than one `differentLevels` slot of count 3 — the printed header fixes WHICH level goes
  // in WHICH slot, and §7-3-2-6 derives the resulting stack order from that same left-to-right
  // reading. The materials keep the plain `match: "text"` with no `printedTextOnly`: a material is
  // a CARD in the trash, where there is no live stack to over-read in the first place.
  assemblyRequirement: [
    {
      materials: [5, 4, 3].map((level) => ({
        count: 1,
        level,
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" as const }],
      })),
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-044", compiled);
