import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const family = [
  { tokens: ["Angel", "Archangel"], match: "trait" },
  { tokens: ["Fallen Angel"], match: "trait" },
] satisfies NonNullable<Filter["nameOrTrait"]>;
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Search",
          effectTextPart:
            "[When Digivolving] You may search your security stack, reveal 1 card with [Angel], [Archangel], or [Fallen Angel] in its traits from it, and add it to your hand. If you added a card, ＜Recovery +1 (Deck)＞.",
          controller: "mine",
          filter: { controller: "mine", nameOrTrait: family },
          count: 1,
          to: "hand",
          searchZone: "security",
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          condition: { kind: "ifThisEffectActed" },
          amount: 1,
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          effectTextPart: "Then, shuffle your security stack.",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "nameExact" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: family }, count: "all" },
          effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
          while: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], colors: ["Purple"] },
            raw: "you have a purple Digimon in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-042", compiled);
