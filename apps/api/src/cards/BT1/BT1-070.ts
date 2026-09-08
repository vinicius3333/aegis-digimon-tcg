import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          // CR 15-15-5-3 (KB Q5067): an immune Digimon is still a legal choice here, so the
          // choice is offered even when it is the opponent's only Digimon.
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, allowUnaffectableChoice: true },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-070", compiled);
export default compiled;
