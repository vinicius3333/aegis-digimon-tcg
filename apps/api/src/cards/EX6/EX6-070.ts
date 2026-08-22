// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX6-070")!;

/** EX6-070 — Phantom Pain, with its Delay self-deletion cost structured. */
export const compiled: CompiledCard = {
  ...generated,
  effects: generated.effects.map((effect) => effect.trigger === "EndOfOpponentsTurn" ? {
    ...effect,
    actions: [{
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
      cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "delete this card" },
      condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lilithmon"], match: "name" }] }, raw: "you have a Digimon with [Lilithmon] in its name" },
      raw: "＜Delay＞ Delete 1 of your opponent's unsuspended Digimon"
    }]
  } : effect),
  coverage: "full",
  residual: []
};

registerIrCard("EX6-070", compiled);
