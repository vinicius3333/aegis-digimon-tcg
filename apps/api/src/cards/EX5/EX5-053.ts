// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-053")!;
export const compiled: CompiledCard = structuredClone(generated);
const securityReaction = compiled.effects.find((effect) => effect.trigger === "OpponentsTurn");
if (securityReaction) {
  securityReaction.trigger = "OnSecurityCheck";
  securityReaction.actions = [
    {
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Deva"], match: "trait" }],
          isRevealedSecurityCard: true,
        },
        count: 1,
      },
      from: ["security"],
      payCost: false,
    },
  ];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-053", compiled);
