import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-027", getCompiledCard("BT12-027")!);

export default module;
