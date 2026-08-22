import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-097", structuredClone(getCompiledCard("BT12-097")!));

export default module;
