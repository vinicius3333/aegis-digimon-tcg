import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-045 Examon (Green/Red/Blue Lv.7 Mega, Data, [Holy Warrior]/[Royal Knight], 15000 DP,
// play cost 15, printed EvoCosts: Green/Red/Blue Lv.6 for 5 each).
//
// Printed clauses:
//   [DNA Digivolve] Green Lv.6 + Blue Lv.6 : Cost 0
//   ＜Raid＞ ＜Piercing＞ ＜Security A. +1＞ ＜Blocker＞ ＜Evade＞
//   [When Digivolving] If DNA digivolving, this Digimon attacks and all of your Digimon get
//     +10000 DP until your opponent's turn ends. Then, this Digimon may battle 1 of your
//     opponent's Digimon.
//   [Your Turn] [Once Per Turn] When this Digimon wins a battle, you may play or use 1 play or
//     use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution
//     cards without paying the cost.
// No inherited effect and no security effect are printed.
//
// KB: `node tools/kb/query.mjs card EX13-045` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §7-2 DNA digivolution: the two materials merge into ONE permanent whose digivolution cards
//     are both materials plus their own stacks, which is what makes "its digivolution cards" a
//     real second source zone for the play-or-use clause.
//   - §3-4-5-8: breeding-area cards cannot be referenced by effects, so "all of your Digimon"
//     stays at the battle-area default of permanent targeting.
//   - §14 battle: the "may battle" sentence is a direct DP comparison, not an attack — no attack
//     declaration, no security check, and the loser (or both, on a tie) is deleted.
//
// The five `Static` keyword entries below are LOAD-BEARING, not record-keeping: deleting them
// turns four behavioural tests red (the two security checks, the ＜Raid＞ switch and the
// ＜Piercing＞ pass-through), so a compiled card's keywords come from its IR rather than from the
// `PRINTED_MATCHERS` regex in `apps/api/src/engine/combat/keywords.ts`. Mutation-confirmed.

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } satisfies Target;
const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } satisfies Target;

const keyword = (keywordName: "Raid" | "Piercing" | "Blocker" | "Evade", raw: string): CardEffect => ({
  trigger: "Static",
  actions: [],
  keywords: [{ keyword: keywordName, raw }],
});

// "all of your Digimon get +10000 DP until your opponent's turn ends" — `count: "all"` over the
// controller's battle area. Permanent targeting already defaults to the battle area, which is also
// what §3-4-5-8 requires: the breeding-area Digimon is not referenceable.
const buffAllOwnDigimon: Action = {
  kind: "ModifyDP",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
  amount: 10_000,
  duration: "untilOpponentTurnEnd",
  raw: "all of your Digimon get +10000 DP until your opponent's turn ends",
};

// "this Digimon attacks" — mandatory (no "may"), and a bare attack, so the player is a legal
// target alongside the opponent's suspended Digimon: `attackPlayer` is deliberately left absent,
// which `interpreter/actions/combat.ts:36` reads as "no narrowing" for a self-target attack. The
// printed sentence joins the attack and the DP buff with "and", so both halves land in the same
// step; because the interpreter runs actions sequentially and an Attack action resolves the whole
// battle inline, the buff is applied FIRST — otherwise the +10000 DP would arrive after the very
// battle it is printed to support.
const attackSelf: Action = {
  kind: "Attack",
  target: self,
  withoutSuspending: false,
  raw: "this Digimon attacks",
};

// "Then, this Digimon may battle 1 of your opponent's Digimon." A `Battle` action, not a second
// Attack: §14 DP comparison with no attack declaration and no security check (BT26-047, EX11-074).
const mayBattle: Action = {
  kind: "Battle",
  attacker: self,
  defender: opponentDigimon,
  optional: true,
  raw: "this Digimon may battle 1 of your opponent's Digimon",
};

// "[Dracomon] or [Examon] text card": `match: "text"` is the name ∪ trait ∪ printed-text union
// (`matchNameOrTrait`), so it reaches a Coredramon that only MENTIONS [Examon] in its effect text
// as well as every card actually named Dracomon/Examon. No `printedTextOnly` here: every candidate
// is a loose card in hand or under this Digimon, matched against its own definition, so there is
// no live digivolution stack that could widen the match (the EX13-021/EX13-024 seam only applies
// to battle-area permanents).
const dracomonOrExamonText = [{ tokens: ["Dracomon", "Examon"], match: "text" as const }];

// "play or use cost 12 or lower": `playCostLte` is the printed play/use cost ceiling. Digi-Eggs
// are excluded by listing the playable kinds rather than by cost — EX13-005 Bebydomon is a
// [Dracomon]-text Digi-Egg whose -1 cost would otherwise pass the ceiling, and a Digi-Egg can
// never be played to the battle area.
const playableTarget = {
  filter: {
    controllerDefault: "mine",
    kind: ["Digimon", "Tamer"],
    nameOrTrait: dracomonOrExamonText,
    playCostLte: 12,
  },
  count: 1,
  // "its digivolution cards" — `source: "thisDigimon"` narrows only the HOSTED zones
  // (`targeting/loose.ts:327`), so the hand half of the pool stays open while a
  // digivolution-card candidate must sit under this Examon rather than under any Digimon.
  source: "thisDigimon",
} satisfies Target;

const optionTarget = {
  filter: {
    controllerDefault: "mine",
    kind: ["Option"],
    nameOrTrait: dracomonOrExamonText,
    playCostLte: 12,
  },
  count: 1,
  source: "thisDigimon",
} satisfies Target;

// "play or use" is two verbs, so the body is a Modal with one branch each — `PlayWithoutCost` for
// the playable kinds, `UseOptionWithoutCost` for the Option side (EX13-043/EX13-012 shape).
// `runModal` drops a branch with no legal candidate and auto-selects when only one remains, so a
// hand holding only an Option never offers a dead "play" branch.
// `allowMultiColor: true`: the printed sentence carries no single-color restriction, and the
// catalog's [Examon]-text Options include the two-color EX3-070; the Option's OWN color
// requirement is still enforced by `optionColorRequirementMet`.
const playOrUseDragonCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Dracomon]/[Examon] text card", "Use a [Dracomon]/[Examon] text Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableTarget,
        from: ["hand", "digivolutionCards"],
        payCost: false,
        optional: true,
        raw: "you may play 1 play or use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        // `filter` is the action's required eligibility predicate (it also supplies the
        // `playCostLte` cap); `target` is what carries the `source: "thisDigimon"` zone narrowing
        // into `candidateLooseInstances`. Both name the same filter on purpose.
        filter: optionTarget.filter,
        target: optionTarget,
        from: ["hand", "digivolutionCards"],
        payCost: false,
        allowMultiColor: true,
        optional: true,
        raw: "you may use 1 play or use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards without paying the cost",
      },
    ],
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-045",
  effects: [
    keyword("Raid", "＜Raid＞"),
    keyword("Piercing", "＜Piercing＞"),
    { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }] },
    keyword("Blocker", "＜Blocker＞"),
    keyword("Evade", "＜Evade＞"),
    // "If DNA digivolving" gates the whole clause, so the condition sits on every action rather
    // than only the first: a normal digivolve into Examon must not attack, buff, or battle.
    {
      trigger: "WhenDigivolving",
      actions: [buffAllOwnDigimon, attackSelf, mayBattle].map((action) => ({
        ...action,
        condition: { kind: "isDnaDigivolving" as const },
      })),
    },
    // "[Your Turn] [Once Per Turn] When this Digimon wins a battle, ..." — the `whenBattleWon`
    // watcher scoped to this permanent. `trigger: "YourTurn"` stamps the watcher's `turnScope`,
    // so a battle won on the opponent's turn (through ＜Blocker＞, which this card prints) does
    // NOT fire it; `frequency: "OncePerTurn"` is the printed per-turn budget.
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          raw: "When this Digimon wins a battle",
          actions: [playOrUseDragonCard],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // "[DNA Digivolve] Green Lv.6 + Blue Lv.6 : Cost 0" — the printed header is a THIRD route next
  // to the catalog's three Lv.6-for-5 EvoCosts, and its Green/Blue material pair is narrower than
  // this card's own Green/Red/Blue colour identity (BT23-047, EX3-074 shape).
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
  ],
};

registerIrCard("EX13-045", compiled);
