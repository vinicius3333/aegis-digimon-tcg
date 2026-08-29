// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-001 Puyoyomon — manually verified inherited trigger.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          // The printed trigger is explicitly effect-driven; ordinary evolution/manual
          // placement also emits onAddDigivolutionCards but must not activate this watcher.
          sourceFilter: { controllerDefault: "mine", byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-001", compiled);
