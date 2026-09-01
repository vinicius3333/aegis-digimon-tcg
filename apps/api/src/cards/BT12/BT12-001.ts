import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = getCompiledCard("BT12-001")!;

registerIrCard("BT12-001", compiled);
