// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const chronomon = {
  controller: "mine",
  kind: ["Digimon"],
  levels: [6],
  nameOrTrait: [{ tokens: ["Chronomon"], match: "name" }],
};

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
    { keyword: "Reboot", raw: "＜Reboot＞" },
    { keyword: "Blocker", raw: "＜Blocker＞" },
    { keyword: "Succession", raw: "＜Succession (Lv.6 w/[Chronomon] in name)＞" },
  ],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ReturnTopDigivolutionCards",
          target: { filter: opponentDigimon, count: 3 },
          cardsPerTarget: 5,
          order: "any",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ReturnTopDigivolutionCards",
          target: { filter: opponentDigimon, count: 3 },
          cardsPerTarget: 5,
          order: "any",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "effects",
          filter: chronomon,
          topmostOnly: true,
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToDeck",
          oncePerTurnKey: "BT26-060/delete-on-effect-adds-to-deck",
          actions: [{ kind: "Delete", target: { filter: opponentDigimon, count: 1 }, optional: true }],
          raw: "When your effect adds cards to decks, you may delete 1 of your opponent's Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 6, texts: ["Chronomon"], cost: 5, isAlternate: true },
    // [Giant Slayer] (BT26-085) is a level-less ([Assembly]) Digimon, so this half of the
    // printed "Lv.6 w/[Chronomon] in text/[Giant Slayer]" route carries no level gate — with
    // one it would never be satisfiable, and BT26-085's own "digivolve into [Chronomon:
    // Destroy Mode] instead of leaving" clause would have no legal path.
    { namesExact: ["Giant Slayer"], cost: 5, isAlternate: true },
  ],
};

registerIrCard("BT26-060", compiled);
