import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-012 SaviorHuckmon (Digimon, Red/White, Lv.5 Ultimate [Dragonkin], Data).
// Printed main text:
//   [Digivolve] Lv.4 w/[Huckmon] in text: Cost 3
//   ＜Alliance＞
//   [When Digivolving] [When Attacking] [Once Per Turn] You may play or use 1 white card
//   with [Huckmon] in its text from your hand with the cost reduced by 3.
// Printed inherited text:
//   ＜Alliance＞
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect:
// `texts: ["Huckmon"]` is the engine's "w/[X] in text" source gate (comprehensive §4-22-1,
// the printed-information union) and `level: 4` the printed level. It is strictly wider than
// the catalog EvoCost (Red Lv.4 cost 3), so a White Lv.4 Sistermon Ciel reaches this card
// while a colorless-mismatched Lv.4 without the token does not. Same shape as EX13-011's
// "Lv.3 w/[Huckmon] in text: Cost 2" sibling and EX12-010's alternate pair.
//
// ＜Alliance＞ is a printed keyword outside any timing window, so it compiles to a `Static`
// window carrying only `keywords` — the accepted form in BT23-013 (the Jesmon this card
// digivolves into) and EX12-024. The inherited copy is the same window with
// `isInherited: true`, exactly as EX12-010 mirrors its ＜Raid＞.
//
// "Play or use" is two verbs, so the body is a Modal with one branch each — PlayWithoutCost
// for the playable kinds and UseOptionWithoutCost for the Option side — the same encoding
// EX13-005 and EX12-013 use for this sentence. `runModal` skips a branch with no legal
// candidate and auto-selects when only one remains, and both branches carry `optional: true`,
// so the printed "You may" survives the branch choice.
//
// `payCost: true` with `reduceCostBy: 3` scopes the discount to the single card this
// activation chooses; a `wouldBePlayed` reduceCost replacement would instead install an
// unscoped subscription discounting every play in the window and has no Option-use path.
//
// "1 white card" is a color predicate on the CARD, so `colors: ["White"]` (OR-matched, so a
// Red/White dual-color card still qualifies) rather than `colorsAll`. The two branches split
// only on kind: Digimon/Tamer are played, Options are used. EX13-065/EX13-066 print both
// kinds on one card, and the Modal's per-branch kind filter routes each copy correctly.
//
// The two printed timings share ONE [Once Per Turn], so both windows carry the same
// `sharedUseKey`: the per-turn ledger keys on `EX13-012/ir-shared-0` and a digivolve
// activation spends the attack activation too (EX12-024, EX12-058).
//
// No DigiXros allowance: no white card with [Huckmon] in its text carries a DigiXros
// requirement, so `allowDigiXros` would widen the clause past anything it can reach.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a white [Huckmon]-text card", "Use a white [Huckmon]-text Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    colors: ["White"],
                    nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  colors: ["White"],
                  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a white [Huckmon]-text card", "Use a white [Huckmon]-text Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    colors: ["White"],
                    nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  colors: ["White"],
                  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Huckmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX13-012", compiled);
