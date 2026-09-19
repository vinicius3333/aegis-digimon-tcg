import type { Action, CardEffect, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } satisfies Target;
const opponentDigimon = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } satisfies Target;

const keyword = (keywordName: "Raid" | "Piercing" | "Blocker" | "Evade", raw: string): CardEffect => ({
  trigger: "Static",
  actions: [],
  keywords: [{ keyword: keywordName, raw }],
});

const dnaClause =
  "[When Digivolving] If DNA digivolving, this Digimon attacks and all of your Digimon get +10000 DP until your opponent's turn ends.";
const thenBattleClause = "Then, this Digimon may battle 1 of your opponent's Digimon.";

const buffAllOwnDigimon: Action = {
  kind: "ModifyDP",
  target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
  amount: 10_000,
  duration: "untilOpponentTurnEnd",
  raw: "all of your Digimon get +10000 DP until your opponent's turn ends",
  effectTextPart: dnaClause,
};

const attackSelf: Action = {
  kind: "Attack",
  target: self,
  withoutSuspending: false,
  raw: "this Digimon attacks",
  effectTextPart: dnaClause,
};

const mayBattle: Action = {
  kind: "Battle",
  attacker: self,
  defender: opponentDigimon,
  optional: true,
  raw: "this Digimon may battle 1 of your opponent's Digimon",
  effectTextPart: thenBattleClause,
};

const dracomonOrExamonText = [{ tokens: ["Dracomon", "Examon"], match: "text" as const }];

const playableTarget = {
  filter: {
    controllerDefault: "mine",
    kind: ["Digimon", "Tamer"],
    nameOrTrait: dracomonOrExamonText,
    playCostLte: 12,
  },
  count: 1,
  source: "thisDigimon",
} satisfies Target;

const optionTarget = {
  filter: {
    controllerDefault: "mine",
    kind: ["Option"],
    nameOrTrait: dracomonOrExamonText,
    playCostLte: 12,
  },
  count: 1,
  source: "thisDigimon",
} satisfies Target;

const playOrUseDragonCard: Action = {
  kind: "Modal",
  choose: 1,
  labels: ["Play a [Dracomon]/[Examon] text card", "Use a [Dracomon]/[Examon] text Option"],
  options: [
    [
      {
        kind: "PlayWithoutCost",
        target: playableTarget,
        from: ["hand", "digivolutionCards"],
        payCost: false,
        optional: true,
        raw: "you may play 1 play or use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards without paying the cost",
      },
    ],
    [
      {
        kind: "UseOptionWithoutCost",
        filter: optionTarget.filter,
        target: optionTarget,
        from: ["hand", "digivolutionCards"],
        payCost: false,
        optional: true,
        raw: "you may use 1 play or use cost 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards without paying the cost",
      },
    ],
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-045",
  effects: [
    keyword("Raid", "＜Raid＞"),
    keyword("Piercing", "＜Piercing＞"),
    { trigger: "Static", actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }] },
    keyword("Blocker", "＜Blocker＞"),
    keyword("Evade", "＜Evade＞"),
    {
      trigger: "WhenDigivolving",
      actions: [buffAllOwnDigimon, attackSelf, mayBattle].map((action) => ({
        ...action,
        condition: { kind: "isDnaDigivolving" as const },
      })),
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          raw: "When this Digimon wins a battle",
          actions: [playOrUseDragonCard],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Green", level: 6 },
        { color: "Blue", level: 6 },
      ],
    },
  ],
};

registerIrCard("EX13-045", compiled);
