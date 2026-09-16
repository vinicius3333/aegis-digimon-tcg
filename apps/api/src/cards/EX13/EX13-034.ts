import type { Action, CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-034 Wisemon (Digimon, Yellow/Black, Lv.5 Ultimate [Wizard], Virus, 6000 DP,
// play cost 6, printed EvoCost Yellow Lv.4 for 4).
//
// Printed main text:
//   [Digivolve] Lv.4 w/[Witchelny] in text: Cost 3
//   ＜Barrier＞
//   [On Play] [When Digivolving] [When Attacking] [Once Per Turn] Until your opponent's turn
//     ends, 1 of your Digimon gains ＜Reboot＞ and ＜Blocker＞, and their ＜De-Digivolve＞
//     effects don't affect it.
//   [All Turns] [Once Per Turn] When your security stack is removed from, ＜De-Digivolve 1＞ 1 of
//     your opponent's Digimon. Then, if you have 3 or fewer security cards, 1 of their Digimon
//     can't digivolve until their turn ends.
// Printed inherited text:
//   [All Turns] [Once Per Turn] When your security stack is removed from, this Digimon may
//     unsuspend.
// No printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-034` reports no entries — EX13 is pre-release, so there
// are no card-specific rulings. General rules consulted:
//   - comprehensive §15-5 Trigger Conditions: a "when a card is removed from your security stack"
//     effect triggers ONCE even when two or more cards leave the stack together. The engine's
//     `whenSecurityRemoved` bus fires per removal, so the printed [Once Per Turn] is what keeps a
//     multi-card removal to a single activation here; both clauses carry it.
//   - comprehensive §15-15-3: merely REVEALING a security card is not a removal, so a reveal must
//     not arm these watchers. That is the bus' own contract (it is fired from the removal sites),
//     not something the IR can restate.
//   - comprehensive §16-25 ＜Barrier＞, §16-4 ＜Blocker＞, §16-11 ＜Reboot＞: engine-resident
//     keywords, so the IR only declares/grants them.
//   - comprehensive §9-4 "don't affect": the named class of effects can neither choose nor affect
//     the protected permanent.

// "1 of your Digimon" — the same ONE Digimon receives both keywords and the ＜De-Digivolve＞
// protection, so the choice is bound once with SelectBind and every follow-up action reads it back
// through `Target.fromSelectionRef`. This is the EX10-031 pair (the only typed encoding for a
// shared selection); three independent `count: 1` targets would let the engine re-select and split
// the grant across three different Digimon.
const SELECTION = "wisemonProtected";

const ownDigimon: Filter = { controller: "mine", kind: ["Digimon"], zone: "battleArea" };
const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

const boundTarget = () => ({ filter: {}, count: 1 as const, fromSelectionRef: SELECTION });

// "their ＜De-Digivolve＞ effects don't affect it" — "their" is the opponent, so the restriction
// carries `byOpponentEffectsOnly: true`: the controller's OWN ＜De-Digivolve＞ still works on the
// protected Digimon. `primitives.ts` `peelStackTops` reads this through `isRestricted`, which
// derives the acting seat, exactly as EX10-031 proves for the same printed sentence.
const grantUntilOpponentTurnEnds = (): Action[] => [
  { kind: "SelectBind", target: { filter: ownDigimon, count: 1, bindAs: SELECTION } },
  {
    kind: "GainKeyword",
    target: boundTarget(),
    keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
    duration: "untilOpponentTurnEnd",
  },
  {
    kind: "GainKeyword",
    target: boundTarget(),
    keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd",
  },
  {
    kind: "Restrict",
    target: boundTarget(),
    restriction: "cantBeDeDigivolved",
    byOpponentEffectsOnly: true,
    duration: "untilOpponentTurnEnd",
    raw: "their ＜De-Digivolve＞ effects don't affect it",
  },
];

// One printed [Once Per Turn] governs all three printed timings, so the three windows share ONE
// use ledger through `sharedUseKey` (EX13-030, EX13-042). A plain per-window `frequency` would
// wrongly grant one activation per timing.
const GRANT_USE_KEY = "EX13-034/grant-reboot-blocker";

const grantWindow = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: GRANT_USE_KEY,
  actions: grantUntilOpponentTurnEnds(),
});

// "if you have 3 or fewer security cards" — the controller's OWN stack, so `seat: "mine"`
// (BT3-003/BT3-041 shape). It is re-read at resolution, AFTER the removal that armed the
// watcher, which is what makes the gate reachable at all.
const thinOwnSecurity: Condition = {
  kind: "zoneCount",
  seat: "mine",
  zone: "security",
  op: "lte",
  value: 3,
  raw: "you have 3 or fewer security cards",
};

export const compiled: CompiledCard = {
  cardId: "EX13-034",
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    grantWindow("OnPlay"),
    grantWindow("WhenDigivolving"),
    grantWindow("WhenAttacking"),
    {
      // "When YOUR security stack is removed from": the watcher's default direction is the
      // source's own seat, and BT24-101/EX13-003 still spell it out with the explicit
      // `triggerRemovedSecuritySeat` fire condition. Kept explicit here so the own-seat reading is
      // asserted rather than inherited from a default.
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          raw: "[All Turns] [Once Per Turn] When your security stack is removed from, ＜De-Digivolve 1＞ 1 of your opponent's Digimon. Then, if you have 3 or fewer security cards, 1 of their Digimon can't digivolve until their turn ends.",
          actions: [
            { kind: "DeDigivolve", target: { filter: theirDigimon, count: 1 }, amount: 1 },
            // "1 of their Digimon" is a FRESH choice, not the De-Digivolved one: the printed
            // sentence re-says "1 of their Digimon" rather than "it" (BT19-073 encodes the same
            // pair of sentences with two independent targets).
            {
              kind: "Restrict",
              target: { filter: theirDigimon, count: 1 },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
              condition: thinOwnSecurity,
              raw: "1 of their Digimon can't digivolve until their turn ends",
            },
          ],
        },
      ],
    },
    {
      // Inherited twin of the same watcher, on whatever digivolves on top of this card.
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          raw: "[All Turns] [Once Per Turn] When your security stack is removed from, this Digimon may unsuspend.",
          actions: [
            {
              kind: "Unsuspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // "Lv.4 w/[Witchelny] in text: Cost 3" carries no color, so it is wider than the catalog
  // EvoCost (Yellow Lv.4 for 4) in the source predicate AND cheaper. `texts` is the printed-
  // information substring reading (comprehensive §4-22-1), the EX13-061 shape.
  digivolutionRequirement: [{ level: 4, texts: ["Witchelny"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-034", compiled);
