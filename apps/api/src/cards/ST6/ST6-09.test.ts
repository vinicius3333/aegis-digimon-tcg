import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST6-09.js";

describe("ST6-09 Kyukimon", () => {
  it("registers the vanilla card and exposes its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-09", as: "card" }] } });
    await s.ready();
    expect(getCardDefinition("ST6-09")).toMatchObject({ nameEn: "Kyukimon", level: 5, dp: 9000 });
    expect(s.perm("card").currentDP).toBe(9000);
    expect(hasRegisteredCompiledCard("ST6-09")).toBe(true);
    expect(runtimeCompiledCard("ST6-09")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
