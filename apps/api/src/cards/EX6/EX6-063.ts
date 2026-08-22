// @ts-nocheck
import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX6-063 — Mirei Mikagura, sourced from the committed complete typed IR. */
export const compiled = getCompiledCard("EX6-063") as CompiledCard;

registerIrCard("EX6-063", compiled);
