import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function compiled() {
  const source = readFileSync(fileURLToPath(new URL("./BT16-063.ts", import.meta.url)), "utf8");
  const match = source.match(/const compiled: CompiledCard = ([\s\S]*?);\n\nregisterIrCard/);
  if (match === null || match[1] === undefined) throw new Error("BT16-063 compiled IR not found");
  return JSON.parse(match[1]) as { effects: { trigger: string; actions: { kind: string; grant?: string; tokens?: string[] }[] }[] };
}

describe("BT16-063 Shakkoumon", () => {
  it("exposes the printed Angel rule trait continuously", () => {
    const effects = compiled().effects;
    const staticEffect = effects.find((effect) => effect.trigger === "Static");
    expect(staticEffect?.actions).toContainEqual(expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }));
    expect(effects.find((effect) => effect.trigger === "WhenDigivolving")?.actions).not.toContainEqual(
      expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }),
    );
  });
});
