// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "MaterialSave", amount: 2, raw: "＜Material Save 2＞" }] },
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "By deleting this Digimon" }, optional: true, abortOnDecline: true }],
    },
    {
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }] }, count: 2, to: "hand" }], rest: "deckBottom" }],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [{ materials: [{ names: ["Shoutmon"] }], count: 2 }],
};

registerIrCard("BT11-012", compiled);
