import { getCompiledCard, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = getCompiledCard("BT2-046") as CompiledCard;

registerIrCard("BT2-046", compiled);

export default compiled;
