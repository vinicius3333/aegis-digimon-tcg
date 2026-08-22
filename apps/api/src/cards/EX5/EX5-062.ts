// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-062 Anubismon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-062")!;
const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
const draw = watcher?.actions.find((action) => action.kind === "Draw");
if (draw?.kind === "Draw") draw.condition = { kind: "ifThisEffectDidNotDelete" };
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-062", compiled);
