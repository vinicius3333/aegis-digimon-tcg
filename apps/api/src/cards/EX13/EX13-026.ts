import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-026 Kudamon (Yellow, Lv.3 Rookie, Vaccine, [Holy Beast]/[DATA SQUAD], play cost 3, DP 1000).
//
// [Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0
//   A `digivolutionRequirement` header, not an effect — the EX13-011 / EX13-012 shape. It is
//   ADDITIVE to the printed Yellow Lv.2 evoCost, so its whole job is to let the off-colour
//   [DATA SQUAD] Digi-Eggs (BT25-002 blue Wanyamon, BT26-002 green Budmon, BT26-005 purple
//   Pinamon) reach this card for 0. `traits` is the exact trait reading, matching the
//   "w/[X] trait" phrasing; `traitSubstrings` would be the "[X] in any of its traits" wording.
//
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1 [Holy Beast],
// [Royal Knight] or [DATA SQUAD] trait card to the hand and place 1 such card face down under
// any of your [DATA SQUAD] trait Tamers. Return the rest to the bottom of the deck.
//   One sentence printed under two timings, so it is two effects sharing one action list — the
//   EX13-007 / EX13-008 shape, not one effect with a compound trigger.
//
//   The three bracketed tokens are a trait union inside ONE `nameOrTrait` reference, because
//   `tokens` is an OR-list and two references would read as a conjunction. `match: "trait"` is
//   exact trait equality (the EX13-006 reading), so a plain [Beast] or [Beast Knight] card is
//   refused where a loose containment reading would wrongly accept it.
//
//   "and place 1 such card" is the BT19-055 construction verbatim in shape ("add 1 ... to the
//   hand and place 1 ... under ... Tamers"), whose binding rulings are KB Q3113 (do as much as
//   possible) and KB Q3114 (with only ONE applicable card revealed it goes to the hand and
//   cannot also go under a Tamer). That is `requiresMinRevealed: 2` on the second slot, counted
//   over the full revealed set. "such card" repeats the same trait union, so the second slot
//   reuses the first slot's filter.
//
//   "face down" is `faceDown: true` — the interpreter maps it to `placeUnder(..., {faceUp:
//   false})`, which is what makes it a §4-6-9 face-down card under a Tamer rather than a
//   public digivolution card. "any of your [DATA SQUAD] trait Tamers" is the HOST restriction,
//   so it lives on `underFilter` (EX12-077 / AD1-015 shape), not on the card filter; with no
//   such Tamer out the slot has no legal host and the interpreter bottoms the card with the
//   rest, which is the printed outcome either way.
//
//   The sentence carries no "you may", so both slots are mandatory — no `optional` / `upTo`.
//   `rest: "deckBottom"` is the printed "Return the rest to the bottom of the deck".
//
// [Inherited] [When Attacking] [Once Per Turn] Give 1 of your opponent's Digimon
// ＜Security A. -1＞ until their turn ends.
//   A `GainKeyword` of `{keyword: "SecurityAttack", amount: -1}` on one opposing Digimon, the
//   BT26-089 / EX12-046 encoding. "until their turn ends" is the opponent's turn, so the
//   duration ref is `untilOpponentTurnEnd`; the grant is handed out during the controller's
//   own attack and must survive into the opponent's turn to matter, which is exactly what
//   that ref models. No `optional`: "Give" is mandatory whenever a target exists.
const TRAIT_UNION: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Holy Beast", "Royal Knight", "DATA SQUAD"], match: "trait" }],
};

const revealAddAndSave = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [
    {
      filter: TRAIT_UNION,
      count: 1,
      to: "hand",
    },
    {
      filter: TRAIT_UNION,
      count: 1,
      to: "underTamer",
      faceDown: true,
      underFilter: {
        controller: "mine",
        kind: ["Tamer"],
        nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
      },
      requiresMinRevealed: 2,
    },
  ],
  rest: "deckBottom",
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [revealAddAndSave()],
    },
    {
      trigger: "OnPlay",
      actions: [revealAddAndSave()],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security A. -1＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["DATA SQUAD"], cost: 0, isAlternate: true }],
};

registerIrCard("EX13-026", compiled);
