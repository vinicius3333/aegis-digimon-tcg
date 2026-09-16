import type { Action, CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-037 Dynasmon (Digimon, Yellow/Red, Lv.6 Mega [Holy Warrior]/[Royal Knight], Data,
// 12000 DP, play cost 12, printed EvoCosts Yellow Lv.5 for 4 and Red Lv.5 for 4).
//
// Printed main text:
//   [Digivolve] Lv.5 w/[Witchelny] in text: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Witchelny] in text
//   ＜Raid＞ ＜Piercing＞ ＜Blocker＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] trash your top security card
//     and this Digimon gets +10000 DP until your opponent's turn ends. Then, if you have 3 or
//     fewer security cards, trash their top security card.
//   [All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's
//     Digimon gets -12000 DP until their turn ends. Then, if you have 3 or fewer security cards,
//     ＜Recovery +1＞
// No printed inherited text and no printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-037` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §7-3 / §7-3-2 / §7-3-2-6 Assembly: materials come from the TRASH, the played
//     card's cost drops by the flat printed amount, and the leftmost listed material (the Lv.5)
//     ends up closest to the played card.
//   - comprehensive §15-5: the "security stack is removed from" condition triggers ONCE even when
//     several cards leave at the same time; the printed [Once Per Turn] carries that here.
//   - comprehensive §15-15-3: a reveal is not a removal.
//   - comprehensive §16-4 ＜Blocker＞, §16-6 ＜Piercing＞, §16-21 ＜Raid＞ are engine-resident, so
//     the IR only declares them.
//   - comprehensive §4-22-1: "w/[X] in text" is the token anywhere in the card's printed
//     information, which `texts` / `match: "text"` encode.
//
// The printed first clause is NOT a "by trashing" cost: it reads "trash your top security card
// AND this Digimon gets +10000 DP", so the trash is an ACTION that can no-op on an empty stack
// while the DP buff still lands. BT24-101 prints the identical construction and encodes it the
// same way — a standalone security trash followed by the modifier.

const self = { filter: { isSelfRef: true }, count: 1 as const, isSelf: true };
const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

// "if you have 3 or fewer security cards" — the controller's own stack, re-read at resolution so
// the gate sees the card this very clause just trashed (BT3-003/BT3-041 shape).
const thinOwnSecurity: Condition = {
  kind: "zoneCount",
  seat: "mine",
  zone: "security",
  op: "lte",
  value: 3,
  raw: "you have 3 or fewer security cards",
};

const trashBoostTrash = (): Action[] => [
  { kind: "trashSecurityTop", controller: "mine", count: 1, raw: "trash your top security card" },
  {
    kind: "ModifyDP",
    target: self,
    amount: 10000,
    duration: "untilOpponentTurnEnd",
    raw: "this Digimon gets +10000 DP until your opponent's turn ends",
  },
  {
    kind: "trashSecurityTop",
    controller: "opponent",
    count: 1,
    condition: thinOwnSecurity,
    raw: "trash their top security card",
  },
];

// One printed [Once Per Turn] over three printed timings ⇒ one shared use ledger
// (EX13-030, EX13-042).
const TRASH_USE_KEY = "EX13-037/trash-and-boost";

const trashWindow = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: TRASH_USE_KEY,
  actions: trashBoostTrash(),
});

const keywordWindow = (keyword: "Raid" | "Piercing" | "Blocker"): CardEffect => ({
  trigger: "Static",
  actions: [],
  keywords: [{ keyword, raw: `＜${keyword}＞` }],
});

export const compiled: CompiledCard = {
  cardId: "EX13-037",
  effects: [
    keywordWindow("Raid"),
    keywordWindow("Piercing"),
    keywordWindow("Blocker"),
    trashWindow("OnPlay"),
    trashWindow("WhenDigivolving"),
    trashWindow("WhenAttacking"),
    {
      // "When security stackS are removed from" — PLURAL, so EITHER player's stack arms it. The
      // watcher's default direction is the source's own seat, so this clause must say
      // `sourceFilter: { controller: "any" }`; `subTrigger.ts`'s `securityRemovalGate` reads that
      // as "any removed seat fires". EX12-019 prints the same plural sentence and encodes it the
      // same way. Note the deliberate asymmetry with the "Then, if YOU have 3 or fewer security
      // cards" tail, which stays on the controller's own stack.
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          raw: "[All Turns] [Once Per Turn] When security stacks are removed from, 1 of your opponent's Digimon gets -12000 DP until their turn ends. Then, if you have 3 or fewer security cards, ＜Recovery +1＞",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: theirDigimon, count: 1 },
              amount: -12000,
              duration: "untilOpponentTurnEnd",
              raw: "1 of your opponent's Digimon gets -12000 DP until their turn ends",
            },
            { kind: "Recover", amount: 1, condition: thinOwnSecurity, raw: "＜Recovery +1＞" },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // "Lv.5 w/[Witchelny] in text: Cost 3" names no color, so it is wider than both catalog
  // EvoCosts (Yellow Lv.5 / Red Lv.5, each for 4) and cheaper than them.
  digivolutionRequirement: [{ level: 5, texts: ["Witchelny"], cost: 3, isAlternate: true }],
  // "Lv.5 × Lv.4 × Lv.3, all w/[Witchelny] in text": three ORDERED single-card slots, each
  // level-pinned, sharing the substring text requirement. This is the EX13-036 per-level shape,
  // NOT EX13-061's single `count: 3` slot — the header fixes a level per slot, so three Lv.5
  // materials are illegal here.
  assemblyRequirement: [
    {
      reduceCost: 5,
      materials: [
        { level: 5, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
        { level: 4, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
        { level: 3, count: 1, nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }] },
      ],
    },
  ],
};

registerIrCard("EX13-037", compiled);
