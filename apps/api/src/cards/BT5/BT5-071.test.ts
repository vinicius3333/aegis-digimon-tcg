import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-071.js";

describe("BT5-071 Guilmon", () => {
  it("gains 1 memory when deleted by an effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon" }] } });
    await (s.engine as any).primitives.deletePermanent([s.perm("guilmon").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("doesn't gain memory when deleted by a rule", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon" }] } });
    await (s.engine as any).primitives.deletePermanent([s.perm("guilmon").permanentId], "byRule");
    await settle();
    expect(s.state.memory).toBe(0);
  });
});
