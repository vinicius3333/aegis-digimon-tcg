import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-014 Jesmon (Digimon, Red/White, Lv.6 Mega [Holy Warrior]/[Royal Knight], Data,
// 12000 DP, play cost 12, printed EvoCost Red Lv.5 for 3).
//
// Printed main text:
//   [Digivolve] Lv.5 w/[Huckmon] in text: Cost 3
//   [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Huckmon] in text
//   [When Digivolving] [When Attacking] [Once Per Turn] You may use 1 use cost 5 or lower
//     [Huckmon] text Option card from your hand or this Digimon's digivolution cards without
//     paying the cost.
//   [All Turns] [Once Per Turn] When any of your Digimon are played, you may delete 1 of your
//     opponent's lowest DP Digimon. Then, if you don't have [Atho or René & Por], you may play
//     1 [Atho, René & Por] Token. (Digimon/White/6000 DP/＜Reboot＞ ＜Blocker＞
//     ＜Decoy (Red)/(Black)＞)
// No printed inherited or security text.
//
// No KB rulings exist for this card — EX13 is pre-release, so `tools/kb/query.mjs card EX13-014`
// reports no entries. Comprehensive rules consulted: §7-3 / §7-3-2 Assembly (materials come from
// the TRASH and are placed under the played card in header order, left-most on top, reducing the
// play cost by the printed amount) and §4-22-1 ("in its text" is the token anywhere in the
// printed information), which the engine models as `match: "text"` — the name ∪ traits ∪ every
// printed text field union.
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect:
// `texts: ["Huckmon"]` with `level: 5` is strictly wider than the catalog EvoCost (Red Lv.5 for
// 3), so a non-red Lv.5 carrying the token — there is none in the catalog today, every Lv.5
// [Huckmon]-text card being SaviorHuckmon — would still reach this card, while a red Lv.5
// WITHOUT the token reaches it only on the printed EvoCost. Same shape as EX13-012's
// "Lv.4 w/[Huckmon] in text: Cost 3" sibling.
//
// [Assembly -5] lists three ordered single-card slots, each of which must satisfy the
// [Huckmon]-text gate on its own (EX12-017 / Q6743 shape). The level is the only thing that
// differs between slots, so the material list is three `count: 1` entries at levels 5, 4 and 3
// rather than one `differentLevels` slot of count 3 — the printed header fixes WHICH level goes
// in WHICH slot, and §7-3-2-6 fixes the resulting stack order from that same left-to-right
// reading.
//
// The Option clause is a single `UseOptionWithoutCost`, not a Modal: the printed verb is "use"
// only and the printed kind is "Option card", so there is no play branch (contrast EX13-012 /
// EX13-005, whose "play or use" needs one). `filter.playCostLte: 5` is the printed "use cost 5
// or lower" cap — spelling it out also replaces the action's historical default of 5 (EX8-037)
// with an intentional value. "from your hand or this Digimon's digivolution cards" is the
// EX12-034 pool: `from: ["hand", "digivolutionCards"]` plus `target.source: "thisDigimon"`,
// which narrows ONLY the hosted zone to the resolving source's own stack while leaving the hand
// pool intact; a bare `from: ["digivolutionCards"]` would span every stack the controller owns.
// `payCost: false` is "without paying the cost".
//
// The two printed timings share ONE [Once Per Turn], so both windows carry the same
// `sharedUseKey`: a digivolve activation spends the attack activation too (EX12-024, EX13-012).
// The [All Turns] watcher prints its OWN [Once Per Turn] on a separate line, so it carries no
// shared key — pooling it would make one clause starve the other.
//
// "When any of your Digimon are played" has no "other", so the watcher's `sourceFilter` carries
// no `excludeSelf` (contrast BT20-017 and BT23-013, which both print "other"): playing Jesmon
// itself arms it. "your opponent's lowest DP Digimon" is `superlative: "lowestDP"`, the
// server-side narrowing applied after base eligibility with every tied extremum eligible
// (EX12-017, BT23-024 Q6025/Q6026). Both halves print "you may", so both actions are optional
// and a declined delete still lets the token half run — the sentence is "Then", not
// "if this effect deleted".
//
// "if you don't have [Atho or René & Por]" gates the token half. The engine's canonical identity
// for this token is the synthetic registry card `TOKEN-AthoRenePor-Token`, whose `nameEn` is
// "AthoRenePor Token" (`packages/shared/src/cards/tokens.ts`; `PlayToken` maps the printed
// descriptor "Atho, René & Por" onto that alias). An exact-name condition against that registry
// name is therefore the precise reading — a `nameExact` ref against the printed descriptor would
// never match anything, and a substring ref would be looser than the printed bracket needs.
// `zone: "battleArea"` keeps the count off the breeding area, which a token can never occupy but
// which `countMatching` would otherwise include.
const huckmonOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

// `filter` is the action's required eligibility predicate (it is what sets the cost cap);
// `target` carries the same predicate plus the `source: "thisDigimon"` narrowing, because only
// the target form reaches the instance-level zone scoping in `candidateLooseInstances`.
const useHuckmonOption = (): Action => ({
  kind: "UseOptionWithoutCost",
  filter: huckmonOption,
  target: { filter: huckmonOption, count: 1, source: "thisDigimon" },
  from: ["hand", "digivolutionCards"],
  payCost: false,
  optional: true,
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [useHuckmonOption()],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [useHuckmonOption()],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
                count: 1,
              },
              optional: true,
            },
            {
              kind: "PlayToken",
              tokens: [
                {
                  name: "Atho, René & Por",
                  kind: "Digimon",
                  color: "White",
                  dp: 6000,
                  keywords: [
                    { keyword: "Reboot" },
                    { keyword: "Blocker" },
                    { keyword: "Decoy", colors: ["Red", "Black"] },
                  ],
                },
              ],
              count: 1,
              payCost: false,
              optional: true,
              condition: {
                kind: "youHaveNone",
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["AthoRenePor Token"], match: "nameExact" }],
                },
                raw: "you don't have [Atho or René & Por]",
              },
            },
          ],
          raw: "When any of your Digimon are played, you may delete 1 of your opponent's lowest DP Digimon. Then, if you don't have [Atho or René & Por], you may play 1 [Atho, René & Por] Token.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Huckmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        { count: 1, level: 5, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
        { count: 1, level: 4, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
        { count: 1, level: 3, nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }] },
      ],
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-014", compiled);
