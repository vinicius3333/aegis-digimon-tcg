import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-033 Mistymon (Digimon, Yellow, Lv.5 Ultimate [Magic Warrior]/[Witchelny], Virus, 7000 DP,
// play cost 7, printed EvoCosts Yellow Lv.4 for 4 and Red Lv.4 for 4).
//
// Printed main text:
//   [Digivolve] Lv.4 w/[Witchelny] in text: Cost 3
//   ＜Barrier＞
//   [On Play] [When Digivolving] You may place 1 [Witchelny] text card from your hand as the
//     bottom security card. Then, by trashing your top security card, 1 of your Digimon may
//     attack.
//   [All Turns] [Once Per Turn] When your security stack is removed from, 1 of your opponent's
//     Digimon gets -6000 DP for the turn. Then, if you have 3 or fewer security cards, delete 1
//     of their 6000 DP or lower Digimon.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When your security stack is removed from, this Digimon may
//     unsuspend.
//
// KB: `node tools/kb/query.mjs card EX13-033` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §16-25 ＜Barrier＞: a BATTLE-deletion-only immediate-type prevention paid by
//     trashing the controller's top security card. Engine-resident (`respondBarrier`), so the
//     keyword only needs the `keywords` marker and no actions.
//   - comprehensive §4-22-1: "[X] text card" reads name ∪ traits ∪ printed text as one union.
//
// The alternate [Digivolve] header is a `digivolutionRequirement`, not an effect: cost 4 → 3, and
// the source predicate widens from "Yellow or Red Lv.4" to ANY colour Lv.4 whose TEXT mentions
// [Witchelny] (`texts`, the EX12-014 / EX12-033 "w/[X] in text" field).
//
// ON PLAY / WHEN DIGIVOLVING. Two printed timings, ONE sentence, and NO printed [Once Per Turn],
// so the two windows are independent copies of the same action list (the EX13-007 / EX13-027
// shape) and carry neither `frequency` nor `sharedUseKey`.
//
//   "You may place 1 [Witchelny] text card from your hand as the bottom security card" is
//   `op: "addBottom"` with a hand-scoped `source` Target (the BT19-036 / BT21-024 shape) and
//   `optional: true`. The printed phrase says "1 [Witchelny] TEXT CARD", not "1 Digimon card", so
//   the filter carries no `kind`. Nothing reveals the placed card, so it goes face down: no
//   `faceUp`, no `revealChosen`.
//
//   "Then, by trashing your top security card, 1 of your Digimon may attack" is a separate
//   process whose "may" attaches to the attack, so it is an `Attack` action with `optional: true`
//   and the top-security `trash` cost. It is NOT `withoutSuspending` — nothing in the printed
//   sentence says so (contrast EX13-077's "may attack without suspending") — so the chosen Digimon
//   suspends as usual. `abortOnDecline: true` keeps a declined or unpayable attack from leaking
//   into any later action of the same effect. The two processes are independent: declining the
//   placement does not skip the attack, which is why the placement carries no `abortOnDecline`.
//
//   Order matters and is printed: the placement runs FIRST, so the card it adds to the bottom is
//   already in the stack when the attack's cost trashes the TOP card. With a one-card stack the
//   placement therefore saves the attack from trashing the card that is about to be attacked over.
//
// ALL TURNS WATCHER. "When your security stack is removed from" is the `whenSecurityRemoved`
// sub-trigger with `fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }` — the
// EX13-003 / BT13-003 encoding, where the seat guard is what keeps an attack into the OPPONENT's
// security from firing it. The printed [Once Per Turn] is the effect's `frequency`.
//
//   The body mirrors EX13-029's: a mandatory -6000 `ModifyDP` for the turn, then a mandatory
//   `Delete` gated by `zoneCount ... lte 3`. The gate is an `ActionBase.condition` on the delete,
//   evaluated when that action runs, so it reads the stack AFTER the removal that triggered the
//   watcher. "1 of THEIR 6000 DP or lower Digimon" is the same opponent-side pool as the first
//   process, with the printed live-DP ceiling `dp: { op: "lte", value: 6000 }` — which the -6000
//   just applied can itself bring a target under.
//
// INHERITED. The same `whenSecurityRemoved` + own-seat watcher, once per turn, whose whole body is
// an optional self-`Unsuspend` ("THIS Digimon", hence `isSelfRef`/`isSelf`, not a board filter).
const ownSecurityRemoved = {
  kind: "triggerRemovedSecuritySeat",
  seat: "mine",
} as const;

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } as const;

const placeWitchelnyTextCardAsBottomSecurity: Action = {
  kind: "SecurityManipulation",
  op: "addBottom",
  controller: "mine",
  amount: 1,
  source: {
    filter: {
      controller: "mine",
      zone: "hand",
      nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
    },
    count: 1,
  },
  optional: true,
  raw: "You may place 1 [Witchelny] text card from your hand as the bottom security card",
};

const attackByTrashingTopSecurity: Action = {
  kind: "Attack",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
  cost: {
    kind: "trash",
    target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
    raw: "by trashing your top security card",
  },
  optional: true,
  abortOnDecline: true,
  raw: "Then, by trashing your top security card, 1 of your Digimon may attack",
};

const entryWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [placeWitchelnyTextCardAsBottomSecurity, attackByTrashingTopSecurity],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
    entryWindow("OnPlay"),
    entryWindow("WhenDigivolving"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: ownSecurityRemoved,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -6000,
              duration: "forTheTurn",
              raw: "1 of your opponent's Digimon gets -6000 DP for the turn",
            },
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: { op: "lte", value: 6000 },
                },
                count: 1,
              },
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
              raw: "Then, if you have 3 or fewer security cards, delete 1 of their 6000 DP or lower Digimon",
            },
          ],
          raw: "When your security stack is removed from, 1 of your opponent's Digimon gets -6000 DP for the turn. Then, if you have 3 or fewer security cards, delete 1 of their 6000 DP or lower Digimon.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: ownSecurityRemoved,
          actions: [
            {
              kind: "Unsuspend",
              target: self,
              optional: true,
              raw: "this Digimon may unsuspend",
            },
          ],
          raw: "When your security stack is removed from, this Digimon may unsuspend.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, texts: ["Witchelny"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-033", compiled);
