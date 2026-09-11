import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-072 Kota Domoto (Tamer, Black, play cost 4, [Chronicle] trait).
//
// Printed clauses:
//   [Start of Your Main Phase] By trashing 1 [Chronicle] trait card from your hand,
//     ＜Draw 1＞ and gain 1 memory.
//   [Your Turn] When one of your [Chronicle] trait Digimon attacks, by suspending this
//     Tamer, you may use 1 [X Antibody] or 1 Option card with the [Chronicle] trait from
//     your hand with the cost reduced by 1.
//   [Security] Play this card without paying the cost.
// No inherited effect is printed (Tamers carry none).
//
// KB: `node tools/kb/query.mjs card EX13-072` reports no entries — EX13 is pre-release, so
// there are no card-specific rulings. General rules consulted in
// `data/kb/rules/comprehensive.md`:
//   - §4-23-2: "[X] trait" is the card's printed trait line, matched as an exact trait
//     token — hence `match: "trait"` everywhere below and never `traitContains`. The
//     sibling [X Antibody] trait printed alongside [Chronicle] on the BT20 cards must not
//     satisfy a [Chronicle] gate, which exact matching guarantees.
//   - §4-23-1: a BRACKETED card reference such as "1 [X Antibody]" is a card NAME, not a
//     trait, and a bracketed name is an exact identity — `match: "nameExact"`. The catalog
//     holds exactly one card named "X Antibody" (BT9-109); EX5-070 "X Antibody Proto Form"
//     carries the [X Antibody] TRAIT and a superset name, and is correctly out of scope.
//   - §7-2: [Start of Your Main Phase] resolves once, at the start of the controller's own
//     main phase, before any action is taken.
//   - §15-7: "By <cost>, <effect>" — the cost gates the whole sentence, so the draw and the
//     memory gain live inside one `CostGatedBlock` with `abortOnDecline`. Declining pays
//     nothing (BT26-092 prints this exact sentence with a different trait and is encoded
//     identically).
//   - §4-22-3: "with the cost reduced by 1" is a reduction, not a waiver, so the Option's
//     own colour requirement still applies (`payCost: true`, no `waiveColorRequirement`).

const chronicleTrait = [{ tokens: ["Chronicle"], match: "trait" as const }];

// "By trashing 1 [Chronicle] trait card from your hand" — the printed noun is "card", so no
// `kind` narrowing: a Digimon, Tamer, Option or Digi-Egg with the trait all pay it.
const drawAndGainMemory: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "trash",
    target: {
      count: 1,
      filter: { zone: "hand", controller: "mine", nameOrTrait: chronicleTrait },
    },
    raw: "By trashing 1 [Chronicle] trait card from your hand",
  },
  optional: true,
  abortOnDecline: true,
  raw: "By trashing 1 [Chronicle] trait card from your hand, ＜Draw 1＞ and gain 1 memory.",
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "GainMemory", amount: 1 },
  ],
};

// "1 [X Antibody] or 1 Option card with the [Chronicle] trait": a multi-entry `nameOrTrait`
// array is a UNION (`definitionMatches`), so one filter carries both printed branches. Both
// branches are Options — the only card named "X Antibody" is an Option — and `use` is an
// Option-only verb, so `kind: ["Option"]` states the shared scope rather than narrowing the
// name branch away.
//
// `allowMultiColor: true` states the printed scope: the sentence narrows by name/trait only,
// so a multicolour Chronicle Option would stay eligible. Without the flag `optionUseCandidates`
// (`borrowed.ts:444`) drops every non-mono-colour card. Declarative today — no multicolour
// [Chronicle] Option exists in the catalog yet — but it is what the printed text says.
const chronicleOrXAntibodyOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }, ...chronicleTrait],
};

// "by suspending this Tamer, you may use ... with the cost reduced by 1" — the EX12-066 shape:
// a `whenAttacking` SubTrigger anchored to this Tamer, the printed suspend cost on the watcher,
// and the printed "may" on the body. `payCost: true` + `reduceCostBy: 1` is a REDUCTION, not the
// "without paying the cost" waiver, so memory is still charged for the remainder and the Option's
// colour requirement still applies. No `playCostLte`: the printed sentence has no cost ceiling,
// and the runner only applies one when the filter names it.
const useDiscountedOption: Action = {
  kind: "SubTrigger",
  event: "whenAttacking",
  sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: chronicleTrait },
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  actions: [
    {
      kind: "UseOptionWithoutCost",
      filter: chronicleOrXAntibodyOption,
      from: ["hand"],
      payCost: true,
      reduceCostBy: 1,
      allowMultiColor: true,
      optional: true,
      raw: "you may use 1 [X Antibody] or 1 Option card with the [Chronicle] trait from your hand with the cost reduced by 1",
    },
  ],
  raw: "When one of your [Chronicle] trait Digimon attacks, by suspending this Tamer, you may use 1 [X Antibody] or 1 Option card with the [Chronicle] trait from your hand with the cost reduced by 1",
};

const startOfMainPhase: CardEffect = { trigger: "StartOfYourMainPhase", actions: [drawAndGainMemory] };
const yourTurn: CardEffect = { trigger: "YourTurn", actions: [useDiscountedOption] };
const security: CardEffect = {
  trigger: "Security",
  isSecurity: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      payCost: false,
      raw: "[Security] Play this card without paying the cost.",
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-072",
  effects: [startOfMainPhase, yourTurn, security],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-072", compiled);
