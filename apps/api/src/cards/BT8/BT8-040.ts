// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashedThisEffect = { kind: "ifThisEffectActed" };

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenDigivolving",
    actions: [
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine", kind: ["Digimon", "Tamer", "Option"] }, count: 1 }, bindResultAs: "trashedCard", optional: true },
      { kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "colorFromLastTrashed", duration: "forTheTurn", condition: trashedThisEffect },
      { kind: "Draw", controller: "mine", amount: 2, condition: { kind: "allOf", conditions: [trashedThisEffect, { kind: "selfColorCount", op: "gte", value: 2 }] } },
    ],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-040", compiled);
