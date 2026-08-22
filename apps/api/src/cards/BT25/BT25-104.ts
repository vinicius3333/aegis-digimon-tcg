import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type Actions = CompiledCard["effects"][number]["actions"];

// Hand-corrected effect IR for BT25-104 (ShineGreymon: Burst Mode // Final Shining
// Burst), a Red/Yellow DUAL card. The AUTO-GENERATED header was intentionally
// removed so runtime effect-record generation preserves this file. Grounded in the rules KB
// (errata + Q&A) and the source documented behavior; rulings/errata win over printed text.
//
// Why this was rewritten (the runtime record output was partial AND wrong):
//   - The Option side's [Main] had a stray "GainKeyword Rush to all" and a duplicate
//     empty-filter "ModifyDP -15000" that bled in from the Marcus clause, and its
//     "play 1 Tamer" was an unscoped mandatory play. Corrected below to: -15000 DP to
//     exactly one opponent Digimon (mandatory, for the turn), then OPTIONALLY play one
//     Tamer from hand for free (Q6498: an Option-side [Main], so it is an Option-card
//     effect, not a Digimon effect — it bypasses "isn't affected by Digimon effects").
//   - The DUAL "[When Digivolving][When Attacking][Once Per Turn] Activate 1 [Main]
//     effect on this card's Option side" was two EMPTY effect blocks. Q6496/Q6497: this
//     directly activates the [Main] shown on the same DUAL card's Option side (not an
//     Option "use"). Modeled with ActivateMain, which runs this card's own Main effect.
//
// Keyword abilities are explicit permanent continuous grants. Descriptive `keywords`
// metadata alone is not authoritative for runtime combat/leave-prevention consumers, which
// read the continuous ledger. Security Attack carries its numeric +1 amount.
//
// "[Your Turn] All of your [Marcus Damon]s are also treated as 12000 DP Digimon and gain
// ＜Rush＞" (Q6499/Q6500/Q6506): flips every Tamer named [Marcus Damon] to ALSO-Digimon
// with a fixed 12000 DP and grants ＜Rush＞, live only while ShineGreymon: Burst Mode is on
// the field and it's the controller's turn. Modeled with the same continuous primitives as
// BT13-008 / AD1-021 ("treated as a Digimon" bundle): GrantStatic grant:"kinds" (kind-flip,
// a new primitive; it already existed), SetBaseDP (absolute override, NOT ModifyDP's signed
// delta — addBaseDpOverride), and GainKeyword Rush. `count: "all"` targets every matching
// Tamer with no prompt (required: this is a `YourTurn` continuous effect, re-fired every
// recompute via `recomputeContinuousEffects`'s no-prompt `DecisionApi`, so any target needing
// player choice would silently resolve to nothing here). `duration: "permanent"` matches
// this file's own ＜Security A. +1＞ grant above; the engine auto-detects the continuous pass
// and clears/re-derives all three grants every recompute (`continuousOpt()`), so they lapse
// the instant this card leaves the battle area or it stops being the controller's turn.
// "All of your [Marcus Damon]s" — name-matched (a Tamer, so deliberately kind-unrestricted
// beyond "mine"), and `count: "all"` since every matching Tamer is affected, not one chosen.
const marcusTarget = {
  filter: {
    controller: "mine",
    kind: ["Tamer"],
    nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
  },
  count: "all",
};

const compiled: CompiledCard = {
  effects: [
    // ＜Raid＞ ＜Piercing＞ ＜Security A. +1＞ ＜Blocker＞ ＜Barrier＞.
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Raid" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker" },
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Barrier" },
          duration: "permanent",
        },
      ],
    },
    // [When Digivolving] [Once Per Turn] Activate 1 [Main] effect on this card's Option
    // side (Q6496/Q6497: directly activates the same DUAL card's Option-side [Main]).
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "bt25-104/activate-option-main",
      actions: [{ kind: "ActivateMain" }],
    },
    // [When Attacking] [Once Per Turn] Activate 1 [Main] effect on this card's Option side.
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "bt25-104/activate-option-main",
      actions: [{ kind: "ActivateMain" }],
    },
    // [Your Turn] All of your [Marcus Damon]s are also treated as 12000 DP Digimon and
    // gain ＜Rush＞ (see file header for the primitive composition).
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: marcusTarget,
          grant: "kinds",
          tokens: ["Digimon"],
          duration: "permanent",
        },
        {
          kind: "SetBaseDP",
          target: marcusTarget,
          value: 12000,
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: marcusTarget,
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "permanent",
        },
      ] as unknown as Actions,
    },
    // ＜Use Req. ([DATA SQUAD] trait)＞ (§16-42-1): a color-requirement waiver on this
    // card, gated on having a [DATA SQUAD] trait card in play — the corpus' established
    // Static+WaiveColorRequirement+youHave idiom (EX2-072, BT19-093, BT7-110). Reconciled
    // from a prior in-[Main] WaiveColorRequirement action: that placement fired only AFTER
    // the Option side's own play-legality gate had already run (playCard.ts's
    // colorRequirementMet check happens before any [Main] action executes), so it never
    // actually waived anything — moved to a Static block so the waiver is live before the
    // color gate is checked, matching every other card carrying this keyword.
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
            raw: "you have a card w/[DATA SQUAD] trait",
          },
        },
      ],
    },
    // Option side [Final Shining Burst]:
    // [Main] 1 of your opponent's Digimon gets -15000 DP for the turn. Then, you may play
    // 1 Tamer card from your hand without paying the cost.
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -15000,
          duration: "forTheTurn",
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { kind: ["Tamer"] }, count: 1, upTo: true },
          optional: true,
          payCost: false,
          from: ["hand"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 5,
      isAlternate: true,
      level: 6,
      traits: ["DATA SQUAD"],
    },
  ],
};

registerIrCard("BT25-104", compiled);

export default compiled;
