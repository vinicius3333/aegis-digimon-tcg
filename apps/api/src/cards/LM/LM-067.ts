import type { Action, CardEffect, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type NameOrTraitRef = NonNullable<Filter["nameOrTrait"]>[number];

const threeMusketeersText: NameOrTraitRef = { tokens: ["Three Musketeers"], match: "text" };

const freePlayFromReveal: Action = {
  kind: "RevealAdd",
  revealCount: 6,
  add: [
    {
      filter: {
        controllerDefault: "mine",
        kind: ["Digimon", "Tamer", "Option"],
        playCostLte: 6,
        nameOrTrait: [threeMusketeersText],
      },
      count: 1,
      to: "play",
      optional: true,
      orDispositions: [{ filter: { kind: ["Option"] }, to: "useOption" }],
    },
  ],
  rest: "deckBottom",
  raw: "Reveal the top 6 cards of your deck. You may play or use 1 play or use cost 6 or lower [Three Musketeers] text card among them without paying the cost. Return the rest to the bottom of the deck.",
};

const freePlayWindow = (trigger: "WhenDigivolving" | "Counter"): CardEffect => ({
  trigger,
  frequency: "OncePerTurn",
  sharedUseKey: "LM-067/reveal-six",
  actions: [freePlayFromReveal],
});

const makeDeleteForOneTrashedCard = (): Action => ({
  kind: "Delete",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 7 },
    count: 1,
  },
  cost: {
    kind: "trash",
    target: {
      filter: { controller: "mine", zone: "digivolutionCards", nameOrTrait: [threeMusketeersText] },
      count: 1,
    },
    raw: "By trashing 1 [Three Musketeers] text card from any of your Digimon's digivolution cards",
  },
  optional: true,
  abortOnDecline: true,
  raw: "By trashing up to 3 [Three Musketeers] text cards from any of your Digimon's digivolution cards, for each one trashed, delete 1 of your opponent's play cost 7 or lower Digimon.",
});

// "Up to 3 ... for each one trashed": one trash-and-delete pair per card, so declining the
// second pair also skips the third. Each window builds its own three action objects, so the
// digivolve and attack windows never share per-action state and each allows a fresh 3.
const deletionWindow = (trigger: "WhenDigivolving" | "WhenAttacking"): CardEffect => ({
  trigger,
  actions: [0, 1, 2].map(() => makeDeleteForOneTrashedCard()),
});

const threeMusketeersInPlay: Filter = {
  controllerDefault: "mine",
  zone: ["battleArea", "breeding"],
  kind: ["Digimon", "Tamer"],
  nameOrTrait: [threeMusketeersText],
};

export const compiled: CompiledCard = {
  cardId: "LM-067",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Reboot", raw: "＜Reboot＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: threeMusketeersInPlay,
            raw: "you have a card w/[Three Musketeers] in text",
          },
        },
      ],
    },
    freePlayWindow("WhenDigivolving"),
    freePlayWindow("Counter"),
    deletionWindow("WhenDigivolving"),
    deletionWindow("WhenAttacking"),
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 },
          amount: 3,
          raw: "＜De-Digivolve 3＞ 3 of your opponent's Digimon",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: { controller: "mine", kind: ["Digimon"] },
          position: "bottom",
          optional: true,
          raw: "Then, you may place 1 [Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, texts: ["Three Musketeers"], cost: 4, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
  ],
};

registerIrCard("LM-067", compiled);
export default compiled;
