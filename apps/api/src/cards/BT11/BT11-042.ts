// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const family = [
  { tokens: ["Angel", "Archangel"], match: "trait" },
  { tokens: ["Fallen Angel"], match: "trait" },
];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Search",
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
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
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
            nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "name" }],
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
