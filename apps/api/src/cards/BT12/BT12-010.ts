import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-010", getCompiledCard("BT12-010")!);

export default module;
