import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-086", getCompiledCard("BT12-086")!);

export default module;
