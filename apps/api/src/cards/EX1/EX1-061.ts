// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 1,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            zone: "hand",
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }],
          },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { controller: "mine", kind: ["Digimon"], keywords: ["Retaliation"] }, count: "all" },
          duration: "permanent",
          defenderLevelMax: 4,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Myotismon"],
            raw: "this Digimon has [Myotismon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-061", compiled);
