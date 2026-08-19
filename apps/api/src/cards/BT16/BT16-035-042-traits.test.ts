import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function cardIr(cardId: string) {
  const source = readFileSync(fileURLToPath(new URL(`./${cardId}.ts`, import.meta.url)), "utf8");
  const match = source.match(/const compiled: CompiledCard = ([\s\S]*?);\n\nregisterIrCard/);
  if (match === null || match[1] === undefined) throw new Error(`${cardId} compiled IR not found`);
  return JSON.parse(match[1]) as { effects: { trigger: string; actions: { kind: string; grant?: string; tokens?: string[] }[] }[] };
}

describe("BT16 rule traits", () => {
  it("keeps BT16-035 Angel and BT16-042 Insectoid active continuously", () => {
    for (const [cardId, trait] of [["BT16-035", "Angel"], ["BT16-042", "Insectoid"]] as const) {
      const effects = cardIr(cardId).effects;
      expect(effects.find((effect) => effect.trigger === "Static")?.actions).toContainEqual(
        expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: [trait] }),
      );
    }
  });
});
