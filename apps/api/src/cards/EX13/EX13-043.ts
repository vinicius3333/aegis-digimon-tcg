import type { Action, CardEffect, CompiledCard, Filter, Scaling, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-043 Leopardmon (Green Lv.6 Mega, Data, [Holy Warrior]/[Royal Knight], 12000 DP,
// play cost 12, printed EvoCost: Green Lv.5 for 3).
//
// Printed clauses:
//   [Digivolve] [Leopardmon: Leopard Mode]: Cost 1
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all Green w/[Mammal]/[Beast]/[Beastkin] trait
//   [On Play] [When Digivolving] You may suspend 1 Digimon. Then, you may return 1 of your
//     opponent's lowest DP Digimon to the bottom of the deck.
//   [When Digivolving] [When Attacking] [Once Per Turn] You may play or use 1 [Mammal], [Beast],
//     [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4. For each
//     suspended Digimon, further reduce it by 1.
//   [All Turns] [Once Per Turn] When any of your suspended Digimon would leave the battle area
//     other than by your effects, by unsuspending 1 of your Digimon, they don't leave.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-043` reports no entries — EX13 is pre-release. General
// rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-2 Assembly: materials come from the TRASH only, the exact printed slot count
//     must be placed, the reduction is the flat printed -5, and §7-3-2-6 puts the leftmost listed
//     material (the Lv.5) closest to the played card.
//   - §3-4-5-8: breeding-area cards cannot be referenced by effects, which is what keeps the
//     board filters here scoped to the battle area.
//   - §15-8-4-4-1 unperformable processing: the `unsuspend` leave cost can only be paid by a
//     currently SUSPENDED permanent, so the cost filter pins `suspended: true` rather than
//     letting the engine pick an unsuspended candidate and then fail.

const ownDigimon = { controller: "mine", kind: ["Digimon"] } satisfies Filter;

// "You may suspend 1 Digimon." — no "of your" and no "of your opponent's", so the pool is EITHER
// player's board (`controller: "any"`, the EX13-027 reading of an unqualified possessive).
// `unsuspended: true` keeps the prompt to permanents the suspend can actually move: the primitive
// refuses an already-suspended transition, and an unfiltered pick would silently waste the choice.
const suspendAnyDigimon: Action = {
  kind: "Suspend",
  target: { filter: { controller: "any", kind: ["Digimon"], unsuspended: true }, count: 1 },
  optional: true,
  raw: "You may suspend 1 Digimon",
};

// "Then, you may return 1 of your opponent's lowest DP Digimon to the bottom of the deck."
// `superlative: "lowestDP"` narrows AFTER base eligibility and keeps every tied extremum
// (BT24-017, ST20-11), so `count: 1` still asks the controller which of two tied bodies goes.
// The second printed "you may" is its own decline, so this action carries its own `optional`
// and deliberately no `abortOnDecline`: declining the suspend does not cancel the return.
const returnLowestDp: Action = {
  kind: "Return",
  target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
  to: "deckBottom",
  optional: true,
  raw: "you may return 1 of your opponent's lowest DP Digimon to the bottom of the deck",
};

// "[Mammal], [Beast], [Beastkin] or [Royal Knight] trait card": "w/... trait" is EXACT trait
// equality over forms ∪ attributes ∪ types, so [Holy Beast] — which merely CONTAINS "Beast" — is
// refused. The printed noun is "card", not "Digimon card", so the play branch covers Digimon and
// Tamer while the use branch covers Options; the catalog has no Tamer with any of these four
// traits today, but the filter states the printed scope rather than the current catalog.
const traitGate = [{ tokens: ["Mammal", "Beast", "Beastkin", "Royal Knight"], match: "trait" as const }];
const playableFromHand = {
  filter: { controllerDefault: "mine", zone: "hand", kind: ["Digimon", "Tamer"], nameOrTrait: traitGate },
  count: 1,
} satisfies Target;
const optionInHand = {
  controllerDefault: "mine",
  zone: "hand",
  kind: ["Option"],
  nameOrTrait: traitGate,
} satisfies Filter;

// "For each suspended Digimon, further reduce it by 1." Unqualified again, so both boards count
// (`controllerDefault: "any"` + `suspended: true`, the EX11-032 / BT25-059 encoding of this exact
// printed phrase). `paidReduction` in `interpreter/actions/play.ts` adds `reduceCostByScaling` to
// the flat `reduceCostBy`, and the play verb floors the result at 0.
const perSuspendedDigimon: Scaling = {
  per: 1,
  filter: { controllerDefault: "any", kind: ["Digimon"], suspended: true },
  unit: "cards",
};

// "Play or use" is two verbs, so the body is a Modal with one branch each — PlayWithoutCost for
// the playable kinds and UseOptionWithoutCost for the Option side — the EX13-012 / EX13-005
// encoding. `runModal` skips a branch with no legal candidate and auto-selects when only one
// remains, and both branches carry `optional: true` so the printed "You may" survives the branch
// choice. `payCost: true` with `reduceCostBy: 4` scopes the discount to the single card this
// activation chooses, rather than installing an unscoped `wouldBePlayed` reduceCost subscription
// that would discount every play in the window.
//
// Both verbs forward the same live scaling reduction to their affordability and payment
// paths; the shared Option use primitive owns payment and floors the effective cost at zero.
const playOrUseTraitCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Mammal]/[Beast]/[Beastkin]/[Royal Knight] card", "Use such an Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableFromHand,
        from: ["hand"],
        payCost: true,
        reduceCostBy: 4,
        reduceCostByScaling: perSuspendedDigimon,
        optional: true,
        raw: "You may play 1 [Mammal], [Beast], [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4. For each suspended Digimon, further reduce it by 1",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionInHand,
        from: ["hand"],
        payCost: true,
        reduceCostBy: 4,
        allowMultiColor: true,
        reduceCostByScaling: perSuspendedDigimon,
        optional: true,
        raw: "You may use 1 [Mammal], [Beast], [Beastkin] or [Royal Knight] trait card from your hand with the cost reduced by 4",
      },
    ],
  ],
};

// One printed [Once Per Turn] governs BOTH timings of the play-or-use clause, so the two windows
// share one per-turn ledger key: a when-digivolving activation spends the when-attacking
// activation too (EX13-012, EX12-024).
const PLAY_USE_KEY = "EX13-043/play-or-use-trait-card";

// "[All Turns] [Once Per Turn] When any of your suspended Digimon would leave the battle area
// other than by your effects, by unsuspending 1 of your Digimon, they don't leave."
//
// A `wouldLeavePlay` Replacement with `leaveCause: "otherThanYourEffect"` (EX13-015, AD1-003):
// the watched set is "your SUSPENDED Digimon", a board filter rather than `isSelfRef`, so the
// host protects allies and itself alike — but only while suspended, which is exactly what the
// suspend clause above sets up. "they don't leave" is plural, so `affectsAll: true` with
// `target.count: "all"` saves every matching Digimon named in the same leave (Q4319).
// The printed [Once Per Turn] on a continuous watcher is the `frequency` budget alone; an extra
// `oncePerTurnKey` would be redundant.
const preventSuspendedLeave: Action = {
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  leaveCause: "otherThanYourEffect",
  optional: true,
  affectsAll: true,
  sourceFilter: { ...ownDigimon, suspended: true },
  target: { filter: { ...ownDigimon, suspended: true }, count: "all" },
  cost: {
    kind: "unsuspend",
    target: { filter: { ...ownDigimon, suspended: true }, count: 1 },
    raw: "by unsuspending 1 of your Digimon",
  },
  raw: "When any of your suspended Digimon would leave the battle area other than by your effects, by unsuspending 1 of your Digimon, they don't leave",
};

const suspendAndBounce = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendAnyDigimon, returnLowestDp],
});

const playOrUse = (trigger: "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: PLAY_USE_KEY,
  actions: [playOrUseTraitCard],
});

export const compiled: CompiledCard = {
  cardId: "EX13-043",
  effects: [
    suspendAndBounce("OnPlay"),
    suspendAndBounce("WhenDigivolving"),
    playOrUse("WhenDigivolving"),
    playOrUse("WhenAttacking"),
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [preventSuspendedLeave] },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] [Leopardmon: Leopard Mode]: Cost 1" — an EXACT name route (`namesExact`), so the
  // plain [Leopardmon] printings do NOT reach it even though "Leopardmon" is a substring of
  // "Leopardmon: Leopard Mode". The printed header carries no level, so the route is name-only
  // and strictly narrower than the catalog's Green Lv.5-for-3 EvoCost rather than wider.
  digivolutionRequirement: [{ namesExact: ["Leopardmon: Leopard Mode"], cost: 1, isAlternate: true }],
  // "[Assembly -5] Lv.5 × Lv.4 × Lv.3, all Green w/[Mammal]/[Beast]/[Beastkin] trait": three
  // ordered single-card slots, each level-pinned, all sharing the Green colour requirement and the
  // EXACT trait disjunction. Three `count: 1` entries rather than one `differentLevels` slot of
  // count 3, because the printed header fixes WHICH level fills WHICH slot and §7-3-2-6 derives
  // the stack order from that same left-to-right reading (EX13-036, EX13-024).
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [5, 4, 3].map((level) => ({
        count: 1,
        level,
        colors: ["Green" as const],
        traits: ["Mammal", "Beast", "Beastkin"],
      })),
    },
  ],
};

registerIrCard("EX13-043", compiled);
