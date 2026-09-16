import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-073 Tai Kamiya & Matt Ishida (Tamer, Black/Purple, [ADVENTURE], play cost 4).
//
// Printed main text:
//   [Start of Your Main Phase] If you have an [ADVENTURE] trait Digimon, gain 1 memory.
//   [Your Turn] When your [ADVENTURE] trait Digimon or Tamers are played, by suspending this
//     Tamer, ＜Draw 1＞ and trash 1 card in your hand.
//   [All Turns] All of your level 5 or higher [ADVENTURE] trait Digimon gain ＜Rush＞ and
//     ＜Blocker＞
// Printed security text:
//   [Security] Play this card without paying the cost.
//
// KB: `node tools/kb/query.mjs card EX13-073` reports no entries — EX13 is pre-release. General
// rules consulted:
//   - comprehensive §4-23-1 / §4-23-2: "[X] trait" is EXACT trait equality over the card's
//     forms ∪ attributes ∪ types, so `match: "trait"` and not the substring `traitContains`.
//   - comprehensive §16-2 ＜Rush＞ and §16-4 ＜Blocker＞ are engine-resident; the IR only grants
//     them.
//   - comprehensive §15-6: a "by <cost>" clause is optional in the sense that declining costs
//     nothing, but the cost must be paid in full for any of the body to happen — hence the single
//     CostGatedBlock wrapping BOTH the draw and the hand trash.
//
// AD1-022 prints the same [Start of Your Main Phase] gain-1-memory shape and the same
// "[Your Turn] When your [ADVENTURE] trait Digimon or Tamers are played, by suspending this
// Tamer, ..." watcher, and is the structural model here. Two deliberate differences: this card's
// gate reads the CONTROLLER's board (`youHave`, not `opponentHas`), and its printed sentence
// lacks AD1-022's "any of your OTHER", so the watcher carries no `excludeSelf` — playing this
// Tamer itself arms it.

const adventureTrait = [{ tokens: ["ADVENTURE"], match: "trait" as const }];

const ownAdventureDigimon: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  nameOrTrait: adventureTrait,
};

// "All of your level 5 or higher [ADVENTURE] trait Digimon" — a continuous board grant re-derived
// every recompute pass, so it reaches Digimon that arrive later and drops off one that stops
// qualifying (a ＜De-Digivolve＞ down to Lv.4). `levelComparison` is the only typed level floor;
// `levelLte` is a ceiling and would invert the clause.
const bigAdventureDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  levelComparison: { op: "gte", value: 5 },
  nameOrTrait: adventureTrait,
};

const grantKeyword = (keyword: "Rush" | "Blocker"): Action => ({
  kind: "GainKeyword",
  target: { filter: bigAdventureDigimon, count: "all" },
  keyword: { keyword, raw: `＜${keyword}＞` },
  duration: "permanent",
});

// "by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand" — ONE cost buying BOTH
// halves, so the pair sits inside a single CostGatedBlock (EX13-070's shape for the same "by
// suspending this Tamer" construction). `abortOnDecline` keeps a declined or unpayable suspension
// from leaking the draw.
const drawAndTrash: Action = {
  kind: "CostGatedBlock",
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
  actions: [
    { kind: "Draw", controller: "mine", amount: 1 },
    { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-073",
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: ownAdventureDigimon,
            raw: "you have an [ADVENTURE] trait Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: adventureTrait },
          raw: "[Your Turn] When your [ADVENTURE] trait Digimon or Tamers are played, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand.",
          actions: [drawAndTrash],
        },
      ],
    },
    { trigger: "AllTurns", actions: [grantKeyword("Rush"), grantKeyword("Blocker")] },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-073", compiled);
