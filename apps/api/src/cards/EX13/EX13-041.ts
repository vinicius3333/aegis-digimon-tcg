import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-041 Groundramon (Green/Red Lv.5 Ultimate, Virus, [Earth Dragon], 7000 DP, play cost 7,
// EvoCost Green Lv.4 / Red Lv.4 for 4).
//
// Printed main text:
//   [Digivolve] [Coredramon]: Cost 3
//   ＜Fortitude＞
//   [On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their
//     Digimon or Tamers can't unsuspend in their next unsuspend phase.
//   [All Turns] This Digimon is also treated as Lv.6 [Breakdramon] for [Examon]'s DNA
//     digivolution.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When any of your Digimon with [Dracomon] or [Examon] in their
//     texts delete your opponent's Digimon in battle, trash their top security card.
//
// KB: `node tools/kb/query.mjs card EX13-041` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings. General rules consulted in `data/kb/rules/comprehensive.md`:
// §6-2/§6-2-1 (the unsuspend phase unsuspends all of the turn player's Digimon and Tamers at
// once — the window this card's lock has to survive into and then expire with), §15-7-1/§15-7-2
// (only an explicit "by X, Y" optional processing condition gates the text after it; this card's
// first sentence is a mandatory Suspend with no "by", so the "Then" clause is not gated on it) and
// §4-23-1/§4-23-2 (a Digimon does not gain its digivolution cards' printed TEXT, only their
// effects — the basis for `printedTextOnly` below).
//
// This card is the Green/Red [Breakdramon] twin of EX13-021 Wingdramon (the [Slayerdramon] half of
// the same ＜Blast DNA Digivolve＞ recipe) and the direct EX13 reprint shape of BT20-042
// Groundramon, which prints the identical "[Digivolve] [Coredramon]: Cost 3", the identical
// Suspend/"Then ... can't unsuspend" pair and the identical "also treated as Lv.6 [Breakdramon]"
// clause. BT20-042's only divergence is its lock duration ("until the end of their turn"); this
// printing scopes the lock to the opponent's next unsuspend phase instead.

// "Suspend 1 of your opponent's Digimon or Tamers." Permanent targeting already defaults to the
// battle area, so no explicit `zone` is needed (contrast a `youHave`-style counting gate).
const suspendOne: Action = {
  kind: "Suspend",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  raw: "Suspend 1 of your opponent's Digimon or Tamers",
};

// "Then, 1 of their Digimon or Tamers can't unsuspend in their next unsuspend phase."
//
// The restriction target is an INDEPENDENT second choice: the sentence re-opens with "1 of their
// Digimon or Tamers", not "It" — so it may land on a permanent other than the one just suspended.
// That is what separates this card from its many near-twins, which all print "It can't unsuspend"
// and therefore carry `sameTarget: true` (EX9-037/EX9-038) or a bound selection ref (EX10-019).
// BT20-042 prints this card's two-independent-choices wording and is modelled with two plain
// targets exactly as here.
//
// `unsuspendDuringOwnUnsuspendPhase`, not the blunter `unsuspend`: the printed lock is scoped to
// "their next unsuspend phase", so an effect-driven unsuspend and an opponent-turn ＜Reboot＞ stay
// legal. `GameEngine.unsuspendAllForSeat` reads exactly this restriction to skip a permanent
// during the phase sweep, while `primitives.unsuspend` only honours the broad `unsuspend` form.
// EX9-037/EX9-038 — the only other printings of the "next unsuspend phase" wording — use the same
// pairing; BT20-042/LM-012/EX10-019 correctly use the broad `unsuspend` because their own wording
// is the whole-turn "can't unsuspend until the end of their turn".
//
// `untilOpponentNextUnsuspendPhase` maps to `EffectDuration.UntilNextUntap`, which `sweepDurations`
// clears at `ownerActivePhaseEnd` — AFTER the active-phase unsuspend has run — so the restriction
// blocks exactly one unsuspend phase and then expires.
//
// No `condition: { kind: "ifThisEffectActed" }`: per §15-7-2 only an explicit "By ..." cost gates
// what follows "Then", and the Suspend here is mandatory. The lock therefore lands even when the
// chosen permanent was already suspended (EX9-037 proves the same).
const unsuspendLock: Action = {
  kind: "Restrict",
  target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
  restriction: "unsuspendDuringOwnUnsuspendPhase",
  duration: "untilOpponentNextUnsuspendPhase",
  raw: "1 of their Digimon or Tamers can't unsuspend in their next unsuspend phase",
};

// The two printed timings share no [Once Per Turn], so each window is its own independent effect
// with no `sharedUseKey`.
const strikeEffect = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [suspendOne, unsuspendLock],
});

// "[All Turns] This Digimon is also treated as Lv.6 [Breakdramon] for [Examon]'s DNA digivolution"
// is TWO grants, exactly as BT20-042/BT20-025/EX13-021 compile it:
//   * `grant: "name"` with the token, so the [Breakdramon] material slot of BT20-045 Examon's
//     ＜Blast DNA Digivolve ([Breakdramon] + [Slayerdramon])＞ recipe sees this permanent, and
//   * `grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] }`,
//     which confines the level treatment to DNA digivolution into a card named Examon. A bare
//     level grant would wrongly let this Lv.5 answer any "Lv.6" requirement.
// `zone: "battleArea"` on the self-reference is load-bearing: "This Digimon" is a battle-area
// object, so the alias must not follow the card into hand, trash or breeding.
const selfInBattleArea: Target = {
  filter: { isSelfRef: true, zone: "battleArea" },
  count: 1,
  isSelf: true,
};
const breakdramonAlias: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: "name",
  tokens: ["Breakdramon"],
  raw: "This Digimon is also treated as [Breakdramon]",
};
const examonDnaLevelSix: Action = {
  kind: "GrantStatic",
  target: selfInBattleArea,
  grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
  raw: "This Digimon is also treated as Lv.6 for [Examon]'s DNA digivolution",
};

// Inherited: "[All Turns] [Once Per Turn] When any of your Digimon with [Dracomon] or [Examon] in
// their texts delete your opponent's Digimon in battle, trash their top security card."
//
// "any of your Digimon", NOT "this Digimon": the watcher is board-wide over the controller's side,
// so `sourceFilter` carries `controller: "mine"` + `kind: ["Digimon"]` and deliberately omits
// `isSelfRef`. `whenDeletesInBattle` already means "this permanent won a battle and deleted the
// opposing Digimon", so the "delete your opponent's Digimon in battle" half needs no extra gate.
// LM-012 Lamortmon prints the very same inherited sentence with a different token and is modelled
// exactly this way; contrast BT20-042, whose own inherited line says "this Digimon" and therefore
// gates on `isSelfRef`.
//
// `match: "text"` is the full card-information union (name ∪ traits ∪ effect text ∪ inherited
// text), so a Digimon merely NAMED Dracomon or Examon qualifies alongside one that only prints the
// token. Both tokens live in one `nameOrTrait` entry because the entries are already OR-matched.
//
// `printedTextOnly: true` narrows that live match to each candidate's OWN printed information. By
// default `permanentMatchesFilter` also folds in the inherited text of a permanent's digivolution
// cards (intentional, EX1-021/Q3208) — which here would make any host carrying THIS card, whose
// own inherited line literally prints "[Dracomon] or [Examon]", match unconditionally and so fire
// off every battle win regardless of the host. §4-23-2 (a Digimon gains a digivolution card's
// effects, not its text) is what scopes "with XX in their texts" to the printed card. LM-012 is the
// prior art for this exact flag on a `whenDeletesInBattle` sourceFilter; EX13-021/EX13-024 hit the
// same trap elsewhere on this card cycle.
//
// "trash their top security card" — "their" is the opponent, whose Digimon was just deleted.
// [Once Per Turn] sits on the enclosing effect, so the budget is one trash per turn per copy of
// this card in a stack, shared across every Digimon the watcher covers (LM-012 proves that shape).
const securityTrashOnBattleWin: Action = {
  kind: "SubTrigger",
  event: "whenDeletesInBattle",
  sourceFilter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
    printedTextOnly: true,
  },
  actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
  raw: "When any of your Digimon with [Dracomon] or [Examon] in their texts delete your opponent's Digimon in battle, trash their top security card",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Fortitude", raw: "＜Fortitude＞" }],
    },
    strikeEffect("OnPlay"),
    strikeEffect("WhenDigivolving"),
    {
      trigger: "AllTurns",
      actions: [breakdramonAlias, examonDnaLevelSix],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [securityTrashOnBattleWin],
    },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] [Coredramon]: Cost 3" is a bracket-only named source with no level and no color,
  // so `namesExact` — the bracketed reference is literal card-name equality, which admits every
  // printing named exactly "Coredramon" (EX13-039, EX13-018, BT20-023, BT20-040, EX3-018, ST1-06)
  // and refuses "Coredramon X"-style relatives. Carrying no color, it is strictly WIDER than the
  // catalog EvoCost on one axis (a blue Coredramon reaches this card for 3) and narrower on
  // another (a green Lv.4 that is not a Coredramon still pays the printed 4).
  digivolutionRequirement: [{ namesExact: ["Coredramon"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-041", compiled);
