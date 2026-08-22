import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-033", getCompiledCard("BT12-033")!);

export default module;
