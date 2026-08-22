// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
              },
              payCost: true,
              from: ["hand"],
              reduceCostBy: 3,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST22-01", compiled);
