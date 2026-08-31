import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST6-05.js";

describe("ST6-05 Elecmon", () => {
  it("registers the vanilla card and exposes its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-05", as: "card" }] } });
    await s.ready();
    expect(getCardDefinition("ST6-05")).toMatchObject({ nameEn: "Elecmon", level: 3, dp: 5000 });
    expect(s.perm("card").currentDP).toBe(5000);
    expect(hasRegisteredCompiledCard("ST6-05")).toBe(true);
    expect(runtimeCompiledCard("ST6-05")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
