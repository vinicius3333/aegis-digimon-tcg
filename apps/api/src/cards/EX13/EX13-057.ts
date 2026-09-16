import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const OWN_X_OR_CHRONICLE: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  zone: "battleArea",
  nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
};

const grantRebootAndBlocker = (): Action[] => [
  {
    kind: "GainKeyword",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1 },
    keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
    duration: "untilOpponentTurnEnd",
    raw: "Until your opponent's turn ends, 1 of your [X Antibody] or [Chronicle] trait Digimon gains ＜Reboot＞",
  },
  {
    kind: "GainKeyword",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
    duration: "untilOpponentTurnEnd",
    raw: "and ＜Blocker＞",
  },
  {
    kind: "GrantImmunity",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    immuneFrom: "opponentDigimonEffects",
    duration: "untilOpponentTurnEnd",
    condition: { kind: "duringAttack", raw: "during an attack" },
    raw: "If during an attack, it also isn't affected by their Digimon effects",
  },
  {
    kind: "ModifyDP",
    target: { filter: OWN_X_OR_CHRONICLE, count: 1, sameTarget: true },
    amount: 5000,
    duration: "untilOpponentTurnEnd",
    condition: { kind: "duringAttack", raw: "during an attack" },
    raw: "and gets +5000 DP",
  },
];

const digivolveIntoChronicle = (): Action => ({
  kind: "Digivolve",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  into: {
    controllerDefault: "mine",
    kind: ["Digimon"],
    nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
  },
  from: ["hand", "trash"],
  payCost: true,
  optional: true,
  raw: "This Digimon may digivolve into a Digimon card with the [Chronicle] trait in the hand or trash",
});

const CHRONICLE_DIGIMON: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
};

const chronicleDontLeave = (): Action => ({
  kind: "Replacement",
  event: "wouldLeavePlay",
  mode: "prevent",
  optional: true,
  affectsAll: true,
  sourceFilter: CHRONICLE_DIGIMON,
  target: { filter: CHRONICLE_DIGIMON, count: "all" },
  cost: { kind: "trashSecurityTop", raw: "by trashing your top security card" },
  raw: "When any of your [Chronicle] trait Digimon would leave the battle area, by trashing your top security card, they don't leave",
});

export const compiled: CompiledCard = {
  cardId: "EX13-057",
  effects: [
    { trigger: "OnPlay", actions: grantRebootAndBlocker() },
    { trigger: "WhenDigivolving", actions: grantRebootAndBlocker() },
    { trigger: "EndOfAttack", frequency: "OncePerTurn", actions: [digivolveIntoChronicle()] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [chronicleDontLeave()],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Raptordramon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["Chronicle"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX13-057", compiled);
