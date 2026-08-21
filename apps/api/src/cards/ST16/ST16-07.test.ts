import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-07.js";
describe("ST16-07 Meramon", () => {
  it("gains memory on deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-07", as: "a" }] } }); s.state.memory = 0;
    await s.engine.primitives.deletePermanent([s.perm("a").permanentId]);
    await settle(() => s.state.memory === 1, 1000);
    expect(s.state.memory).toBe(1);
  });
});
