// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const appmonStack = { controller: "mine", zone: "digivolutionCards", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] };

const linkThenAttack = [
  { kind: "Link", target: { filter: appmonStack, count: 7, upTo: true }, recipient: self, from: ["digivolutionCards"], payCost: false, optional: true },
  { kind: "Attack", target: self, withoutSuspending: true, optional: true },
];

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Rush", raw: "＜Rush＞" },
    { keyword: "Reboot", raw: "＜Reboot＞" },
    { keyword: "Blocker", raw: "＜Blocker＞" },
    { keyword: "Link", amount: 6, raw: "＜Link +6＞" },
  ],
  effects: [
    { trigger: "OnPlay", actions: linkThenAttack },
    { trigger: "WhenDigivolving", actions: linkThenAttack },
    { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [
      { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, optional: true },
      { kind: "RawUnparsed", text: "If this Digimon has 7 link cards, return your opponent's top security card to the bottom of the deck." },
    ] }] },
  ],
  coverage: "partial",
  residual: ["Link does not yet enforce the printed different-names constraint, and the conditional seven-link security return remains RawUnparsed until a link-count condition seam exists."],
  assemblyRequirement: [{ reduceCost: 7, materials: [{ traits: ["Seven Code"], count: 7, differentNames: true }] }],
};

registerIrCard("BT26-086", compiled);
export default compiled;
