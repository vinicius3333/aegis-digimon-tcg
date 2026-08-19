import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function compiled() {
  const source = readFileSync(fileURLToPath(new URL("./BT16-062.ts", import.meta.url)), "utf8");
  const match = source.match(/const compiled: CompiledCard = ([\s\S]*?);\n\nregisterIrCard/);
  if (match === null || match[1] === undefined) throw new Error("BT16-062 compiled IR not found");
  return JSON.parse(match[1]) as { effects: { trigger: string; duration?: string; actions: { kind: string; duration?: string }[] }[] };
}

describe("BT16-062 Zanmetsumon", () => {
  it("keeps copied Gammamon effects active for all turns", () => {
    const effects = compiled().effects.filter((effect) => effect.trigger === "AllTurns");
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions).toHaveLength(1);
      expect(effect.actions[0]?.kind).toBe("GrantStatic");
      expect(effect.actions[0]?.duration).toBe("permanent");
    }
  });
});
