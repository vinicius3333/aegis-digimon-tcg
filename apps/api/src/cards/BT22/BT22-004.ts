// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-004 Wanyamon — manually verified inherited effect.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          // "When effects place" excludes normal/manual stack additions.
          sourceFilter: { controllerDefault: "mine", byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
              from: ["hand"],
              payCost: true,
              reduceCost: 1,
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

registerIrCard("BT22-004", compiled);
