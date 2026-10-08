import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-078")!);
compiled.digivolutionRequirement = compiled.digivolutionRequirement?.map(({ names, ...requirement }) => ({
  ...requirement,
  ...(names === undefined ? {} : { namesExact: names }),
}));

export default registerIrCard("BT12-078", compiled);
