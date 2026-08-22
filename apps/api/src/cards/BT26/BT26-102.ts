// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sevenCode = { controller: "mine", nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] };
const appmon = { controller: "mine", playCostLte: 5, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: { kind: "youHave", filter: sevenCode } }] },
    { trigger: "Main", actions: [{ kind: "RawUnparsed", text: "Place exactly 6 Seven Code trait Digimon cards from your battle area, link cards, or trash under one of your Seven Code Digimon, then optionally digivolve it into Dantemon from hand for free ignoring requirements." }] },
    { trigger: "Security", isSecurity: true, actions: [
      { kind: "PlayWithoutCost", target: { filter: appmon, count: 1 }, from: ["hand", "trash"], payCost: false, optional: true },
      { kind: "AddToHandSelf" },
    ] },
  ],
  coverage: "partial",
  residual: ["The six-card mixed battle-area/link/trash placement cost and its recipient-bound free Dantemon evolution require a combined selection and permanent-relocation seam not present in the current IR."],
};

registerIrCard("BT26-102", compiled);
