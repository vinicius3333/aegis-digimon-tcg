import type { Action, CardEffect, CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const SELECTION = "wisemonProtected";

const ownDigimon: Filter = { controller: "mine", kind: ["Digimon"], zone: "battleArea" };
const theirDigimon: Filter = { controller: "opponent", kind: ["Digimon"], zone: "battleArea" };

const boundTarget = () => ({ filter: {}, count: 1 as const, fromSelectionRef: SELECTION });

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

const GRANT_USE_KEY = "EX13-034/grant-reboot-blocker";

const grantWindow = (trigger: "OnPlay" | "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: GRANT_USE_KEY,
  actions: grantUntilOpponentTurnEnds(),
});

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
  digivolutionRequirement: [{ level: 4, texts: ["Witchelny"], cost: 3, isAlternate: true }],
};

registerIrCard("EX13-034", compiled);
