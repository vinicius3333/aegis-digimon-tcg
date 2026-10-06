import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

/** Keep each capture run separate, including rejected evidence. */
export function visualProbeOptions(name) {
  const { values } = parseArgs({
    options: {
      base: { type: "string", default: "http://localhost:5174" },
      output: { type: "string" },
      speed: { type: "string", default: "normal" },
    },
  });
  if (!["normal", "fast"].includes(values.speed)) throw new Error("--speed must be normal or fast");
  const output = values.output
    ? pathToFileURL(resolve(values.output) + sep)
    : new URL(`../../.local/motion-reference/${name}/${Date.now()}-${values.speed}/`, import.meta.url);
  return { ...values, output };
}
