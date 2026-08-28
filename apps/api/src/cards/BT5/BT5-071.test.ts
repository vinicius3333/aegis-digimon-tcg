import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-071.js";

describe("BT5-071 Guilmon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-071")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory when deleted by an effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon", under: ["BT5-006"] }] } });
    await advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("doesn't gain memory when deleted by the 0-DP rule", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "guilmon", dp: 0 }] } });
    await advance(s.engine).verb.deletePermanent([s.perm("guilmon").permanentId], "byRule");
    await settle();
    expect(s.state.memory).toBe(0);
  });
});
