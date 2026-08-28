import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [{ names: ["Monitamon"] }, { names: ["Monitamon"] }, { names: ["Monitamon"] }],
      count: 2,
    },
  ],
};

export { compiled };
registerIrCard("BT10-063", compiled);
