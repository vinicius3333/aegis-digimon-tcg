import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-064.js";
import { allowsExtraDigiXrosMaterials } from "../../engine/effects/interpreter.js";

describe("EX10-064", () => {
  it("registers the replacement as a one-under-Tamer plus one-trash DigiXros expansion", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0] as {
      additionalEffects?: Array<{ kind: string }>;
    };
    expect(replacement.additionalEffects).toEqual([
      { kind: "AllowDigiXrosMaterialsFromTrash" },
      { kind: "DigiXrosExtraMaterial" },
    ]);
    expect(allowsExtraDigiXrosMaterials("EX10-064")).toBe(true);
    expect(compiled.coverage).toBe("full");
  });
});
