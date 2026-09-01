// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const anyDigimonTamer = { filter: { controller: "any", kind: ["Digimon", "Tamer"] }, count: 2 };
const opponentDigimonTamer = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 };
const suspendLock = [
  { kind: "Suspend", target: anyDigimonTamer, optional: true },
  { kind: "Restrict", target: opponentDigimonTamer, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
];
const securityCost = {
  kind: "Return",
  target: { filter: { controller: "any", kind: ["Digimon"], suspended: true, excludeSelf: true }, count: 1 },
  to: "deckBottom",
  optional: true,
};
const trashSecurity = {
  kind: "SecurityManipulation",
  op: "trashTop",
  controller: "opponent",
  amount: 1,
  condition: { kind: "ifThisEffectActed" },
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: suspendLock },
    { trigger: "WhenDigivolving", actions: [securityCost, trashSecurity] },
    { trigger: "WhenAttacking", actions: [securityCost, trashSecurity] },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "Suspend", target: opponentDigimonTamer },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"], suspended: true },
            count: "all",
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"], suspended: true },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
    {
      cost: 0,
      isAlternate: true,
      namesExact: ["Rosemon"],
      burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
    },
  ],
};
registerIrCard("BT26-050", compiled);
export default compiled;
