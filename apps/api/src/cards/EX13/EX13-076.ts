import type { Action, CardEffect, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-076 Imperialdramon: Paladin Mode (White/Blue/Green Lv.7 Mega, Vaccine,
// [Ancient Holy Warrior], 16000 DP, play cost 16, printed EvoCosts Blue Lv.6 for 6 and
// Green Lv.6 for 6).
//
// Printed clauses:
//   [Digivolve] Lv.6 w/[Free]/[Royal Knight] trait: Cost 5
//   [Assembly -8] 6 [Free]/[Royal Knight] trait Digimon cards w/different names
//   ＜Piercing＞ ＜Vortex＞ ＜Blocker＞ ＜Evade＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may suspend 1 of your
//     opponent's Digimon. Then, you may return all digivolution cards of 1 of their Digimon to
//     the bottom of the deck and have this Digimon battle it. Compare the number of digivolution
//     cards instead of DP in this battle.
//   [All Turns] [Once Per Turn] When this Digimon wins a battle, you may return 1 of your
//     opponent's Digimon to the bottom of the deck. Then, this Digimon may unsuspend.
//   [Rule] Trait: Has [Free] Attribute.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-076` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-3 / §7-3-2 Assembly: materials come from the TRASH only, the EXACT printed count must be
//     placed (§7-3-2-4), the reduction is the flat printed value (§7-3-2-1), Assembly is never
//     mandatory (§7-3-2-9), and §7-3-2-6 stacks the leftmost listed material closest to the
//     played card. All of that lives in `actions/assembly.ts`; the card supplies only the recipe.
//   - §14 battle: "have this Digimon battle it" is a direct comparison, not an attack — no attack
//     declaration and no security check, and the loser (or both, on a tie) is deleted.
//   - §16-35-1 / §16-35-4 ＜Iceclad＞: the ONE rule in this engine that swaps a permanent-vs-
//     permanent battle's metric from DP to digivolution-card count, and it applies when EITHER
//     battler carries it (`combat/resolve.ts`). That is exactly what the printed last sentence
//     asks for, so the clause grants the keyword for the battle rather than inventing a metric.
//   - §15-6-2: different processes in one effect do not inherit each other's processing
//     conditions, which is why declining the leading "You may suspend" does NOT skip the
//     "Then, you may ..." half (no `abortOnDecline` on the Suspend).
//   - §16-45 is not involved: this card prints no ＜Guard＞.
//
// [Digivolve] Lv.6 w/[Free]/[Royal Knight] trait: Cost 5
//   An alternate route carrying NO colour, so it is strictly wider than the two printed Lv.6-for-6
//   EvoCosts: a BLACK Lv.6 [Royal Knight] reaches this card for 5. `traits` is EXACT trait
//   equality over forms ∪ attributes ∪ types (the "w/[X] trait" wording) and its entries are
//   OR-matched, which is the printed "[Free]/[Royal Knight]" slash (EX13-023, EX12-037 shape).
//
// [Assembly -8] 6 [Free]/[Royal Knight] trait Digimon cards w/different names
//   ONE repeated slot of `count: 6` with `kinds: ["Digimon"]` (the sentence says "Digimon cards",
//   unlike EX13-063's bare "cards"), the same OR-matched `traits` pair, and `differentNames: true`
//   (EX12-060 / EX12-076 / EX13-063 single-slot shape). No level bound is printed.
//
// ＜Piercing＞ ＜Vortex＞ ＜Blocker＞ ＜Evade＞
//   Four engine-resident keywords declared as one `Static` effect. Per the coordinator notes a
//   `Static` keywords entry is NOT decorative: `effect.ts` turns each into a self-targeted
//   `GainKeyword` through the continuous ledger, and `combat/legality.ts` reads that ledger
//   BEFORE falling back to regex-parsing printed text.
//
// [Rule] Trait: Has [Free] Attribute.
//   `staticTraitsOf` (`engine/cards/cardData.ts:299`) already regex-parses this line straight out
//   of `effectText`, so the trait is live in every zone with no IR at all — the `GrantStatic`
//   entry below is kept for record completeness exactly as peers do, and the report does not
//   claim it as behaviourally proven. It matters because the card's OWN [Free] trait is what lets
//   one Paladin Mode answer another's [Digivolve] / Assembly trait references.
const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };

const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

// "You may suspend 1 of your opponent's Digimon." A bare Suspend with no orientation predicate,
// matching EX13-041 / EX12-051's identical printed sentence: an already-suspended Digimon stays a
// legal (if inert) choice, which is what the printed text says.
const maySuspendOne: Action = {
  kind: "Suspend",
  target: { filter: opponentDigimon, count: 1 },
  optional: true,
  raw: "You may suspend 1 of your opponent's Digimon",
};

// "Then, you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and
// have this Digimon battle it."
//
// One printed "may" covering THREE operations on ONE chosen Digimon, so the choice is made once by
// a leading `SelectBind` (the only action that records a reusable binding — `Target.bindAs` on an
// ordinary action target is read by `costs.ts` and `SelectBind` alone) and the rest reference it
// through `fromSelectionRef`. `optional: true` + `abortOnDecline: true` makes that single prompt
// the printed "you may": a decline skips the remaining SIBLING actions of this effect, so nothing
// is stripped and no battle happens.
const mayChooseBattleTarget: Action = {
  kind: "SelectBind",
  target: { filter: opponentDigimon, count: 1, bindAs: "paladinBattleTarget" },
  optional: true,
  abortOnDecline: true,
  raw: "you may return all digivolution cards of 1 of their Digimon to the bottom of the deck and have this Digimon battle it",
};

// "Compare the number of digivolution cards instead of DP in this battle."
//
// ＜Iceclad＞ IS that rule (§16-35-4), and `resolvePermanentBattle` switches the metric when
// EITHER battler carries the keyword, so granting it to this Digimon for the battle is the printed
// sentence rather than an approximation. Granted BEFORE the strip and the battle so the metric is
// already in place when `forceBattle` compares.
// `untilEndOfBattle` is the narrowest real `EffectDurationRef` for "in this battle" — see the
// retained residual: nothing sweeps the `endBattle` boundary after a direct (non-attack) battle.
const compareDigivolutionCards: Action = {
  kind: "GainKeyword",
  target: self,
  keyword: { keyword: "IceClad", raw: "＜Ice Clad＞" },
  duration: "untilEndOfBattle",
  raw: "Compare the number of digivolution cards instead of DP in this battle",
};

// "return all digivolution cards of 1 of their Digimon to the bottom of the deck" — the Digimon
// STAYS in the battle area with only its top card, which is `ReturnTopDigivolutionCards` with
// `position: "bottom"` (take from the stack bottom, send to the DECK bottom — EX6-061/BT26-060
// shape), NOT `Return.returnDigivolutionCardsFirst` (which then returns the Digimon too) and NOT
// `DeDigivolve` (which trashes the top card and promotes a source, with a level-3 floor).
// `cardsPerTarget` is a ceiling the runner slices the stack by, and the primitive additionally
// clamps it to "always leave one card", so any value at or above the longest legal digivolution
// stack spells the printed "all".
const returnAllDigivolutionCards: Action = {
  kind: "ReturnTopDigivolutionCards",
  target: { filter: opponentDigimon, count: 1, fromSelectionRef: "paladinBattleTarget" },
  cardsPerTarget: 99,
  position: "bottom",
  raw: "return all digivolution cards of 1 of their Digimon to the bottom of the deck",
};

// "and have this Digimon battle it" — mandatory once the single "may" above was accepted, and
// against the SAME bound Digimon, so the action carries no `optional` of its own.
const battleBoundTarget: Action = {
  kind: "Battle",
  attacker: self,
  defender: { filter: opponentDigimon, count: 1, fromSelectionRef: "paladinBattleTarget" },
  raw: "have this Digimon battle it",
};

// The three printed timings share ONE [Once Per Turn], so all three windows carry the same
// `sharedUseKey`: an [On Play] activation spends the [When Digivolving] and [When Attacking]
// activations too (EX13-023, EX13-020, EX12-024).
const suspendAndBattleEffect = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "ir-shared-paladin-suspend-battle",
  actions: [
    maySuspendOne,
    mayChooseBattleTarget,
    compareDigivolutionCards,
    returnAllDigivolutionCards,
    battleBoundTarget,
  ],
});

// "[All Turns] [Once Per Turn] When this Digimon wins a battle, you may return 1 of your
// opponent's Digimon to the bottom of the deck. Then, this Digimon may unsuspend."
//
// `whenBattleWon` scoped to this permanent by `sourceFilter: { isSelfRef: true }` (EX13-045,
// EX12-051). `trigger: "AllTurns"` stamps no turn scope, so a battle won on the opponent's turn —
// which this card's printed ＜Blocker＞ makes routine — fires it too. Both halves are their own
// printed "may", and §15-6-2 keeps them independent: declining the return still offers the
// unsuspend.
const battleWonEffect: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [
    {
      kind: "SubTrigger",
      event: "whenBattleWon",
      sourceFilter: { isSelfRef: true },
      raw: "When this Digimon wins a battle",
      actions: [
        {
          kind: "Return",
          target: { filter: opponentDigimon, count: 1 },
          to: "deckBottom",
          optional: true,
          raw: "you may return 1 of your opponent's Digimon to the bottom of the deck",
        },
        {
          kind: "Unsuspend",
          target: self,
          optional: true,
          raw: "this Digimon may unsuspend",
        },
      ],
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-076",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Evade", raw: "＜Evade＞" },
      ],
    },
    suspendAndBattleEffect("OnPlay"),
    suspendAndBattleEffect("WhenDigivolving"),
    suspendAndBattleEffect("WhenAttacking"),
    battleWonEffect,
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: self,
          grant: "trait",
          tokens: ["Free"],
          raw: "[Rule] Trait: Has [Free] Attribute.",
        },
      ],
    },
  ],
  coverage: "partial",
  residual: [
    "Compare the number of digivolution cards instead of DP in this battle. — the ＜Iceclad＞ grant is installed for `untilEndOfBattle`, but EffectDuration.UntilEndBattle is only swept by GameEngine.sweepCombatDurations (GameEngine.ts:1705), which runs solely from CombatController.cleanup() at the END OF AN ATTACK. A direct (non-attack) battle never crosses that boundary, so the count-comparison grant survives the single battle it is printed for and leaks into any later battle in the same turn.",
  ],
  digivolutionRequirement: [{ level: 6, traits: ["Free", "Royal Knight"], cost: 5, isAlternate: true }],
  assemblyRequirement: [
    {
      reduceCost: 8,
      materials: [{ count: 6, kinds: ["Digimon"], traits: ["Free", "Royal Knight"], differentNames: true }],
    },
  ],
};

registerIrCard("EX13-076", compiled);
