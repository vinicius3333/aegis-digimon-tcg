// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const angel = [
  { tokens: ["Angel", "Archangel"], match: "trait" },
  { tokens: ["Fallen Angel"], match: "trait" },
];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 }, optional: true },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Mirei Mikagura"], match: "name" }, ...angel],
            },
            count: 1,
          },
          to: "hand",
          condition: { kind: "ifThisEffectActed", raw: "if you trashed a card" },
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
            nameOrTrait: [{ tokens: ["Angewomon", "Mirei Mikagura"], match: "name" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
          oncePerTurnKey: "when-angel-or-mirei-played",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: angel }, count: "all" },
          effect: { kind: "keyword", keyword: { keyword: "Retaliation", raw: "＜Retaliation＞" } },
          while: {
            kind: "youHave",
            filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], colors: ["Yellow"] },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-083", compiled);
