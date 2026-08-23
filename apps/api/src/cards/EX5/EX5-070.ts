// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-070")!;
export const compiled: CompiledCard = structuredClone(generated);
const inherited = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const replacement = inherited?.actions.find((action) => action.kind === "Replacement");
if (replacement?.kind === "Replacement") {
  replacement.actions = [
    {
      kind: "Return",
      target: { filter: { zone: "digivolutionCards", controller: "mine", kind: ["Digimon"] }, count: 1 },
      to: "hand",
      optional: true,
    },
    {
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      source: {
        filter: {
          zone: "digivolutionCards",
          controller: "mine",
          nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }],
        },
      },
      amount: 1,
      faceDown: true,
    },
  ];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-070", compiled);
