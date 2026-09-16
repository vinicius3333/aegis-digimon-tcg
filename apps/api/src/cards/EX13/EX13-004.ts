import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
          },
          from: ["hand"],
          reduceCost: 1,
          payCost: true,
          optional: true,
          raw: "This Digimon may digivolve into a Digimon card with [Witchelny] in its text in the hand with the cost reduced by 1",
        },
        {
          kind: "trashSecurityTop",
          controller: "mine",
          count: 1,
          condition: { kind: "ifThisEffectDigivolved", raw: "this effect digivolved" },
          raw: "If this effect digivolved, trash your top security card",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-004", compiled);
