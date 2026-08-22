import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-063")!);
compiled.effects = compiled.effects.filter(
  (effect) => !(effect.trigger === "Static" && effect.actions.some((action) => action.kind === "RawUnparsed")),
);
compiled.coverage = "full";
compiled.residual = [];
registerIrCard("BT12-063", compiled);
