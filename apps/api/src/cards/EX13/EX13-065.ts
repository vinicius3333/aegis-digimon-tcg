import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-065 Sistermon Blanc (Awakened) / Divine Pierce (Awakened).
// A DUAL [Digimon/Option] card (`isDualCard`): White/Yellow Lv.3 Rookie [Puppet], Vaccine,
// play cost 5, DP 5000, and an Option side whose printed colour requirement is White.
//
// Printed Digimon-side text:
//   [Digivolve] [Sistermon Blanc]: Cost 0
//   [Digivolve] Lv.2 w/[Huckmon] in text: Cost 1
//   ＜Decode ([Sistermon Blanc])＞
//   ＜Guard＞
// Printed Option-side text (`optionEffect`, the [Main] body play-card fires at OnUseOption):
//   [Main] You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash
//   without paying the cost. Then, to 1 of your opponent's Digimon, give -3000 DP for the turn
//   for each of your Digimon.
// No inherited text and no [Security] effect are printed, and `evoCosts` is empty, so the two
// [Digivolve] headers are the ONLY routes onto this card.
//
// No KB rulings exist for this card (EX13 is pre-release; `tools/kb/query.mjs card EX13-065`
// reports no entries). General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-5-2 DUAL cards: "A player declares whether they will use either the Digimon
//     information or Option information on a DUAL card, then it can be used." That declaration
//     is the `useAs: "option"` field on the play-card intent; the [Main] body compiles under
//     `trigger: "Main"`, which `timingsForTrigger` routes to `EffectTiming.OnUseOption`
//     (BT25-043's accepted dual shape).
//   - §16-36 / §16-36-1 ＜Decode (X)＞: "When this Digimon would leave the battle area other
//     than in battle, you may play 1 <X> from THAT DIGIMON'S digivolution cards without paying
//     the cost." The Digimon still leaves — Decode is not a leave prevention.
//   - §16-45 ＜Guard＞: "When any of a player's other Digimon would leave the battle area by an
//     opponent's effect, by deleting the Digimon with this effect, it doesn't leave."
//     Immediate-type (§16-45-2) and optional to process (§16-45-3).
//   - §4-22-1 card names / §4-23-1 "in its text": a bracketed name with no qualifier is the
//     EXACT name; "with [X] in its name" is the substring reading.
//   - §15-6-2: separate processes in one effect do not inherit each other's conditions, and the
//     Option text prints no "if you did", so declining the optional play must NOT abort the
//     "Then, ... give -3000 DP" process.
//
// ＜Decode ([Sistermon Blanc])＞
//   Encoded the way EX12-014 (hand-audited) and BT24-027 encode the same keyword: the `Static`
//   `keywords` record (load-bearing — a Static keyword entry grants the token through the
//   continuous ledger, per the EX13 coordinator correction) plus an executable `AllTurns`
//   `Replacement` on `wouldLeavePlay` with `leaveCause: "otherThanBattle"` and
//   `sourceFilter: { isSelfRef: true }`. The played card comes from
//   `from: ["digivolutionCards"]` scoped to THIS permanent's own stack via
//   `hostFilter: { isSelfRef: true }` (CR §16-36-1; without it the pool spans every stack the
//   controller owns — `applyDecodeHostScope` would inject the same scope off `playedByDecode`,
//   but EX12-014's explicit form documents the intent).
//   The filter is `match: "nameExact"`, NOT the substring `"name"`: the printed token is the
//   bare `[Sistermon Blanc]`, and a substring read would wrongly accept this very card
//   ("Sistermon Blanc (Awakened)") and BT7-082 out of the stack.
//   No `isInherited` copy: the keyword is printed on the Digimon's own text, and this card
//   prints no inherited text at all. (BT24-014 carries a duplicated inherited copy; that is a
//   generator artifact of a card whose catalog text differs, not a pattern to follow.)
//
// ＜Guard＞ is granted by the Static keyword entry and executed by the shared
// live per-holder reaction, including its optional self-payment.
//
// Option side [Main]
//   Two processes in one effect list:
//   1. `PlayWithoutCost` with `optional: true` ("You may"), `payCost: false` ("without paying
//      the cost"), `from: ["hand", "trash"]`, and a filter carrying both printed restrictions:
//      `playCostLte: 4` and one substring name reference. NO `kind` restriction — the printed
//      word is "card", not "Digimon card", so a [Sistermon] Tamer/Option also qualifies
//      (contrast EX13-028, which prints "Digimon card"). The substring `match: "name"` follows
//      BT23-013's encoding of the same "1 ... card with [Sistermon] in its name from your hand
//      or trash without paying the cost" sentence — there is no card literally named
//      "Sistermon", so the exact reading would be dead text.
//   2. `ModifyDP` of -3000 `forTheTurn` on `count: 1` opponent Digimon, multiplied by
//      `scaling` over `unit: "cards"` ("for each of your Digimon"). `countMatching` defaults to
//      the battle area and deliberately excludes breeding (§3-4-7-7/8), so no explicit `zone`
//      is needed. The count is taken when THIS process resolves, so a Digimon the first process
//      played is already included.
//   The two processes are independent: no `abortOnDecline` on the play, so declining it still
//   applies the DP reduction (§15-6-2).
const sistermonBlancFromOwnStack: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  hostFilter: { isSelfRef: true },
  nameOrTrait: [{ tokens: ["Sistermon Blanc"], match: "nameExact" }],
};

const decodeReplacement: Action[] = [
  {
    kind: "Replacement",
    event: "wouldLeavePlay",
    leaveCause: "otherThanBattle",
    sourceFilter: { isSelfRef: true },
    actions: [
      {
        kind: "PlayWithoutCost",
        target: { filter: sistermonBlancFromOwnStack, count: 1 },
        from: ["digivolutionCards"],
        payCost: false,
        playedByDecode: true,
        optional: true,
      },
    ],
    raw: "＜Decode ([Sistermon Blanc])＞ (When this Digimon would leave the battle area other than in battle, you may play 1 [Sistermon Blanc] from its digivolution cards without paying the cost.)",
  },
];

export const compiled: CompiledCard = {
  cardId: "EX13-065",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Decode", raw: "＜Decode ([Sistermon Blanc])＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    },
    {
      trigger: "AllTurns",
      actions: decodeReplacement,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 4,
              nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          raw: "You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash without paying the cost",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -3000,
          duration: "forTheTurn",
          scaling: { per: 1, unit: "cards", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
          raw: "Then, to 1 of your opponent's Digimon, give -3000 DP for the turn for each of your Digimon",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Sistermon Blanc"], cost: 0, isAlternate: true },
    { level: 2, texts: ["Huckmon"], cost: 1, isAlternate: true },
  ],
};

registerIrCard("EX13-065", compiled);
