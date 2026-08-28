import { describe, expect, it } from "vitest";
import type { CompiledCard } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

function card(id: string): CompiledCard {
  const compiled = runtimeCompiledCard(id);
  if (!compiled) throw new Error(`Missing runtime IR for ${id}`);
  return compiled;
}

function nodesWithKey(value: unknown, key: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (key in record) found.push(record);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return found;
}

describe("BT19-041 through BT19-102 manual audit evidence", () => {
  it("has a full residual-free runtime record for every card in the collection", () => {
    for (let number = 41; number <= 102; number += 1) {
      const id = `BT19-${String(number).padStart(3, "0")}`;
      const ir = card(id);
      expect(ir.coverage).toBe("full");
      expect(ir.residual).toEqual([]);
    }
  });

  it("limits BT19-041's security-trash costs to the top security card", () => {
    const costs = nodesWithKey(card("BT19-041"), "raw").filter((node) =>
      String(node.raw).includes("top card of your security"),
    );
    expect(costs).toHaveLength(2);
    costs.forEach((node) => {
      const filter = (node.target as { filter?: Record<string, unknown> })?.filter;
      expect(filter).toMatchObject({ zone: "security", position: "top" });
    });
  });
});
