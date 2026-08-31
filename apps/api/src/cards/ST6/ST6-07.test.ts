import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST6-07.js";

describe("ST6-07 Youkomon", () => {
  it("registers the vanilla card and exposes its catalog stats", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-07", as: "card" }] } });
    await s.ready();
    expect(getCardDefinition("ST6-07")).toMatchObject({ nameEn: "Youkomon", level: 4, dp: 6000 });
    expect(s.perm("card").currentDP).toBe(6000);
    expect(hasRegisteredCompiledCard("ST6-07")).toBe(true);
    expect(runtimeCompiledCard("ST6-07")).toMatchObject({ coverage: "full", residual: [], effects: [] });
  });
});
