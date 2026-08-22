// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const recoveryBody = [
  { kind: "SecurityManipulation", op: "toHand", controller: "mine", source: "securityTop", amount: 1 },
  { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
];

const eligibleIliad = { controllerDefault: "mine", zone: "hand", kind: ["Digimon"], colors: ["Blue", "Red"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: recoveryBody },
    { trigger: "WhenDigivolving", actions: recoveryBody },
    {
      trigger: "EndOfYourTurn",
      actions: [{
        kind: "PlayWithoutCost",
        target: { filter: eligibleIliad, count: 1 },
        from: ["hand"],
        payCost: true,
        reduceCostBy: 4,
        optional: true,
        condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Red", "Purple"] } },
        cost: { kind: "place", destination: "security", position: "bottom", host: "self", target: { filter: { isSelfRef: true }, count: 1 } },
      }],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-022", compiled);
