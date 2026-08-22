// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["Shoutmon"], duration: "permanent" }], keywords: [{ keyword: "MaterialSave", amount: 1, raw: "＜Material Save 1＞" }] },
    { trigger: "YourTurn", isInherited: true, actions: [{ kind: "Aura", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Shoutmon"], match: "name" }] } } }] },
    { trigger: "OnPlay", actions: [
      { kind: "Return", target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], hasDigiXrosRequirements: true }, count: 1, distinctCardNumbers: true }, to: "hand" },
      { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "DigiXrosSubstitute" }, duration: "untilOwnerTurnEnd" },
    ] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-111", compiled);
export { compiled };
