import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const into = {
  controllerDefault: "mine",
  or: [
    { nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }] },
    { nameOrTrait: [{ tokens: ["Dinosaur", "Ceratopsian"], match: "trait" }] },
  ],
} satisfies Filter;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into,
          mode: "reduceCost",
          amount: 1,
          raw: "reduce the digivolution cost by 1",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          withoutSuspending: false,
          drainTimingWindowDuringAttack: true,
          optional: true,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Tyrannomon"] },
              {
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Dinosaur", "Ceratopsian"], match: "trait" }] },
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-013", compiled);
