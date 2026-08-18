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

describe("BT19-021 through BT19-040 manual audit evidence", () => {
  it("has a registered, residual-free runtime record for every card in the audited range", () => {
    for (let number = 21; number <= 40; number += 1) {
      const id = `BT19-${String(number).padStart(3, "0")}`;
      const ir = card(id);
      expect(ir.coverage, id).toBe("full");
      expect(ir.residual, id).toEqual([]);
    }
  });

  it("keeps BT19-022's Save source restricted to the trash", () => {
    const placeUnder = nodesWithKey(card("BT19-022"), "kind").find((node) => node.kind === "PlaceUnder");
    expect((placeUnder?.target as { from?: string[] })?.from).toEqual(["trash"]);
  });

  it("binds BT19-027's returned Digimon level before applying the dynamic bounce cap", () => {
    const ir = card("BT19-027");
    const levelCap = nodesWithKey(ir, "levelLte").find((node) => node.levelLte === "returnedDigimonLevel");
    const store = nodesWithKey(ir, "storeAs").find((node) => node.storeAs === "returnedDigimonLevel");
    expect(levelCap).toBeDefined();
    expect(store).toBeDefined();
    expect(store?.to).toBe("deckBottom");
  });

  it("enforces BT19-034's one-or-fewer-Tamers gate and Digimon-only inherited target", () => {
    const ir = card("BT19-034");
    const countGate = nodesWithKey(ir, "value").find((node) => node.value === 1 && node.op === "lte");
    const targets = nodesWithKey(ir, "amount").filter((node) => node.amount === -2000);
    expect(countGate).toBeDefined();
    expect(targets).toHaveLength(1);
    expect((targets[0]?.target as { filter?: { kind?: string[] } })?.filter?.kind).toEqual(["Digimon"]);
  });

  it("applies BT19-035's Security Attack -1 and DP reduction to the same target", () => {
    const ir = card("BT19-035");
    const subTrigger = nodesWithKey(ir, "event").find((node) => node.event === "whenPlayed");
    const actions = (subTrigger?.actions ?? []) as Record<string, unknown>[];
    expect(actions.map((action) => action.kind)).toEqual(["GainKeyword", "ModifyDP"]);
    expect((actions[1]?.target as { sameTarget?: boolean })?.sameTarget).toBe(true);
  });

  it("fires BT19-039's inherited unsuspend only when security is removed", () => {
    const events = nodesWithKey(card("BT19-039"), "event");
    expect(events.filter((node) => node.event === "whenSecurityRemoved")).toHaveLength(1);
  });
});
