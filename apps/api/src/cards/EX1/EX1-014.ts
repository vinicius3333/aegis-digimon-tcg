// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
          duration: "permanent",
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Imperialdramon"] },
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-014", compiled);
