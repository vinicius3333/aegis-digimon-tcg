// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkCount = { per: 1, unit: "linkCards", filter: { isSelfRef: true } };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "LinkMax", amount: 2, raw: "＜Link +2＞" }
      ]
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] }, count: 3, upTo: true },
          from: ["hand", "trash", "digivolutionCards"],
          payCost: false,
          optional: true,
          condition: { kind: "isDnaDigivolving", raw: "if DNA digivolving" }
        }
      ]
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, scaling: linkCount },
        { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, to: "deckBottom", scaling: linkCount, optional: true }
      ],
      frequency: "OncePerTurn"
    }
  ],
  coverage: "full",
  residual: []
};

registerIrCard("EX11-073", compiled);
