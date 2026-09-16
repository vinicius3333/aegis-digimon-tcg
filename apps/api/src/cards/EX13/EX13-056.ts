import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const blackBlockerDigimon = (maxLevel: number, zone?: "hand"): Filter => ({
  controllerDefault: "mine",
  ...(zone === undefined ? {} : { zone }),
  kind: ["Digimon"],
  colors: ["Black"],
  levelComparison: { op: "lte", value: maxLevel },
  keywords: ["Blocker"],
});

const revealAndFreePlayOnSelfSuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { isSelfRef: true },
  actions: [
    {
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ filter: blackBlockerDigimon(4), count: 1, to: "play", optional: true }],
      rest: "trash",
      raw: "reveal the top 3 cards of your deck. You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying the cost. Trash the rest",
    },
  ],
  raw: "When this Digimon suspends, reveal the top 3 cards of your deck. You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying the cost. Trash the rest",
};

const playBlackBlockerFromHandOnAllySuspend: Action = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: blackBlockerDigimon(5, "hand"), count: 1 },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
  ],
  raw: "When any of your Digimon suspend, you may play 1 level 5 or lower black Digimon card with ＜Blocker＞ from your hand without paying the cost",
};

const mainSuspendClause: CardEffect = {
  trigger: "AllTurns",
  frequency: "OncePerTurn",
  actions: [revealAndFreePlayOnSelfSuspend],
};

const inheritedSuspendClause: CardEffect = {
  trigger: "OpponentsTurn",
  isInherited: true,
  frequency: "OncePerTurn",
  actions: [playBlackBlockerFromHandOnAllySuspend],
};

const compiled: CompiledCard = {
  cardId: "EX13-056",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    mainSuspendClause,
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Machine"],
          raw: "[Rule] Trait: Has [Machine] Type.",
        },
      ],
    },
    inheritedSuspendClause,
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-056", compiled);
