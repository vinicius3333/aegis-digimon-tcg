import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-082", getCompiledCard("BT12-082")!);

export default module;
