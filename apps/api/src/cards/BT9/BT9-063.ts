import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// LoaderLeomon has no printed effects; its catalog evolution recipe is handled
// by the engine while this empty IR records complete executable coverage.
export const compiled: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-063", compiled);
