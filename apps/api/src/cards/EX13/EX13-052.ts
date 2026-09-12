import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-052 Gladimon (Black, Lv.4 Champion [Warrior], Vaccine, play cost 4, DP 4000).
// One printed EvoCost: Black Lv.3 cost 2. The card prints no [Digivolve] header, so there is no
// `digivolutionRequirement` entry — the catalog EvoCost is the only route (EX13-048's shape).
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §16-45 ＜Guard＞: "When any of a player's other Digimon would leave the battle area by an
//     opponent's effect, by deleting the Digimon with this effect, it doesn't leave." It is an
//     immediate-type effect (§16-45-2) and its processing is optional (§16-45-3).
//   - §16-12-1 ＜De-Digivolve n＞: trash cards from the chosen Digimon's digivolution cards
//     starting with the top card.
//   - §4-23-1 / manual §1 "with XX in its text": the token anywhere in the information printed
//     on the card — name, traits, effects, inherited effects, rule and requirement lines.
//
// ＜Guard＞ is granted by the Static keyword entry and executed by the shared
// live per-holder reaction in effects/guard.ts, including its optional self-payment.
//
// [On Play] [On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
//   One printed sentence under two timings and no [Once Per Turn], so it compiles to two
//   independent effects sharing one action list — no `frequency`/`sharedUseKey` (contrast
//   EX13-015, which prints the once-per-turn gate). The action is the engine's `DeDigivolve`
//   primitive with `amount: 1` over `count: 1` opponent Digimon, byte-identical to EX13-046's
//   and EX12-056's encoding of the same sentence. No "may", so it is mandatory.
//   Note the deliberate interaction this card prints: paying ＜Guard＞ deletes Gladimon, which
//   then fires its own [On Deletion] De-Digivolve.
//
// [Inherited] [All Turns] [Once Per Turn] When this Digimon would leave the battle area other
// than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it
// doesn't leave.
//   Byte-identical to EX13-048's inherited line, so it reuses that accepted encoding: a
//   `wouldLeavePlay` prevention with `sourceFilter: { isSelfRef: true }` and
//   `leaveCause: "otherThanYourEffect"`, cost `deleteOwn` over `controller: "mine"` +
//   `excludeSelf` + `match: "text"` ("1 of YOUR OTHER Digimon with [Knightmon] in its text").
//   The printed [Once Per Turn] is the effect's `frequency`; no `oncePerTurnKey` (redundant per
//   the EX13-015/EX13-027 mutation finding).
//   No `printedTextOnly`: that flag narrows a HOST-identity gate whose own printed line prints
//   the tokens it filters by (EX13-021/EX13-024). This filter never looks at the host —
//   `isSelfRef` carries host identity and `excludeSelf` keeps the host out of the cost pool —
//   so the default whole-permanent text read (§4-23 / KB Q3208) is the correct one. It does mean
//   a second Gladimon is payable off its own printed inherited line, which §4-23-3 endorses.
const opponentDigimon: Filter = { controller: "opponent", kind: ["Digimon"] };

const deDigivolveOne = (): Action[] => [
  {
    kind: "DeDigivolve",
    target: { filter: opponentDigimon, count: 1 },
    amount: 1,
    raw: "＜De-Digivolve 1＞ 1 of your opponent's Digimon",
  },
];

export const compiled: CompiledCard = {
  cardId: "EX13-052",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    },
    {
      trigger: "OnPlay",
      actions: deDigivolveOne(),
    },
    {
      trigger: "OnDeletion",
      actions: deDigivolveOne(),
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: 1,
            },
            raw: "by deleting 1 of your other Digimon with [Knightmon] in its text",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-052", compiled);
