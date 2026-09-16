import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const huckmonOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  playCostLte: 5,
  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
};

const useHuckmonOption: Action = {
  kind: "UseOptionWithoutCost",
  filter: huckmonOption,
  target: { filter: huckmonOption, count: 1, source: "thisDigimon" },
  from: ["hand", "digivolutionCards"],
  payCost: false,
  optional: true,
  raw: "you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost",
};

const playHinukamuyToken: Action = {
  kind: "PlayToken",
  tokens: ["Hinukamuy Token"],
  count: 1,
  payCost: false,
  optional: true,
  raw: "You may play 1 [Hinukamuy] Token.",
};

const immuneWhiteDigimon: Action = {
  kind: "Restrict",
  target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["White"] }, count: 1 },
  restriction: "beAffected",
  fromSourceKind: ["Digimon"],
  byOpponentEffectsOnly: true,
  duration: "untilOpponentTurnEnd",
  raw: "until your opponent's turn ends, their Digimon effects don't affect 1 of your white Digimon",
};

const tokenWindow = (trigger: "OnPlay" | "WhenDigivolving"): CardEffect => ({
  trigger,
  actions: [playHinukamuyToken, immuneWhiteDigimon],
});

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    },
    tokenWindow("OnPlay"),
    tokenWindow("WhenDigivolving"),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["White"] },
          actions: [useHuckmonOption],
          raw: "When any of your white Digimon suspend, you may use 1 use cost 5 or lower Option card with [Huckmon] in its text from your hand or this Digimon's digivolution cards without paying the cost",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, texts: ["Huckmon"], cost: 4, isAlternate: true }],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 3,
          kinds: ["Digimon"],
          nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
          differentNames: true,
        },
      ],
      reduceCost: 5,
    },
  ],
};

registerIrCard("EX13-061", compiled);
