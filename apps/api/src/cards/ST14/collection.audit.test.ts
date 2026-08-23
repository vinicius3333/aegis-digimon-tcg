import { describe, expect, it } from "vitest";
import { allCards, getCompiledCard } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./index.js";

const st14Cards = allCards()
  .filter((card) => /^ST14-\d{2}$/.test(card.cardId))
  .sort((a, b) => Number(a.cardId.slice(5)) - Number(b.cardId.slice(5)));

function nodesWithKey(value: unknown, key: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (key in record) found.push(record);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return found;
}

describe("ST14 collection audit ledger", () => {
  it("covers every catalog card with a registered, residual-free IR record", () => {
    expect(st14Cards.map((card) => card.cardId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `ST14-${String(index + 1).padStart(2, "0")}`),
    );
    for (const card of st14Cards) {
      const ir = getCompiledCard(card.cardId);
      expect(runtimeCompiledCard(card.cardId), card.cardId).toBeDefined();
      expect(ir?.coverage, card.cardId).toBe("full");
      expect(ir?.residual, card.cardId).toEqual([]);
    }
  });

  it("preserves exact ST14 targeting, source, and requirement boundaries", () => {
    const impmon = runtimeCompiledCard("ST14-02")!;
    const digivolve = nodesWithKey(impmon, "kind").find(
      (node) => node.kind === "Digivolve" && node.into !== undefined,
    )!;
    expect((digivolve.into as { nameOrTrait?: unknown }).nameOrTrait).toEqual([
      { tokens: ["Beelzemon"], match: "nameExact" },
    ]);
    expect(digivolve.from).toEqual(["trash"]);
    expect(digivolve.ignoreRequirements).toBe(true);

    const blast = runtimeCompiledCard("ST14-10")!;
    expect(nodesWithKey(blast, "event").some((node) => node.event === "whenTrashedFromDeck")).toBe(true);
    expect(nodesWithKey(blast, "event").some((node) => node.event === "onRevealFromDeck")).toBe(false);

    const barrage = runtimeCompiledCard("ST14-12")!;
    const delay = nodesWithKey(barrage, "kind").find((node) => node.kind === "Delete")!;
    expect(delay).toBeDefined();
  });
});
