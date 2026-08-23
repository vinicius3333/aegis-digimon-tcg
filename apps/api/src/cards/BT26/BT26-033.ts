// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ts = { controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
const iliad = { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };
const _opponentDigimon = { controller: "opponent", kind: ["Digimon"] };

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Raid", raw: "＜Raid＞" },
    { keyword: "Alliance", raw: "＜Alliance＞" },
    { keyword: "Engage", raw: "＜Engage＞" },
  ],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, source: "securityTop" },
        {
          kind: "Modal",
          choose: 1,
          condition: { kind: "isYourTurn", raw: "if it is your turn" },
          labels: ["Play an Iliad card", "Use an Iliad Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: { filter: { ...iliad, kind: ["Digimon", "Tamer"] }, count: 1 },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 5,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: { ...iliad, kind: ["Option"] },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 5,
                optional: true,
              },
            ],
          ],
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: ts,
          target: { filter: ts, count: 1 },
          raw: "When your TS Digimon or Tamer would leave, by placing this Digimon's top stacked card as bottom security, it doesn't leave.",
          cost: {
            kind: "placeAsSecurity",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            position: "bottom",
          },
          actions: [],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 4, isAlternate: true }],
};

registerIrCard("BT26-033", compiled);
