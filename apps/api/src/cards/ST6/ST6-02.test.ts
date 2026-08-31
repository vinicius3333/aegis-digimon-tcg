import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST6-02.js";

describe("ST6-02 DemiDevimon", () => {
  it("registers the vanilla card and exposes its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-02", as: "card" }] } });
    await s.ready();
    expect(getCardDefinition("ST6-02")).toMatchObject({ nameEn: "DemiDevimon", level: 3, dp: 4000 });
    expect(s.perm("card").currentDP).toBe(4000);
    expect(hasRegisteredCompiledCard("ST6-02")).toBe(true);
    expect(runtimeCompiledCard("ST6-02")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
