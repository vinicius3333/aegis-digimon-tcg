// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-063 Leviamon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-063")!;

registerIrCard("EX5-063", compiled);
