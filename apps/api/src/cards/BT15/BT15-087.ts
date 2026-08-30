// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const traitFilter = { nameOrTrait: [{ tokens: ["X Antibody", "DigiPolice"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
    { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", controller: "mine", value: 2 } }] },
    { trigger: "Main", actions: [{ kind: "MindLink", target: { filter: { controller: "mine", kind: ["Digimon"], ...traitFilter }, count: 1 } }] },
    {
      trigger: "AllTurns", isInherited: true,
      actions: [
        { kind: "Aura", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, effect: { kind: "keyword", keyword: { keyword: "Alliance", raw: "＜Alliance＞" } }, while: { kind: "selfTopHasText", filter: traitFilter } },
        { kind: "Aura", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, effect: { kind: "keyword", keyword: { keyword: "Reboot" } }, while: { kind: "selfTopHasText", filter: traitFilter } },
      ],
    },
    {
      trigger: "EndOfAllTurns", isInherited: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Shuu Yulin"], match: "name" }] }, count: 1 }, fromOwnDigivolutionStack: true, payCost: false, optional: true }],
    },
  ], coverage: "full", residual: [],
};

registerIrCard("BT15-087", compiled);
