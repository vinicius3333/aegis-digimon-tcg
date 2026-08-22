// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX6-061 — Gate of Deadly Sins reactions, sourced from the committed typed IR. */
export const compiled = getCompiledCard("EX6-061") as CompiledCard;

registerIrCard("EX6-061", compiled);
