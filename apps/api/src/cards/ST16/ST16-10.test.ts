import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST16-10.js";

describe("ST16-10 Mammothmon", () => {
  it("exposes Blocker and inherited Retaliation from its evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-10", as: "mammothmon", under: [{ card: "ST16-04" }] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("mammothmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mammothmon"), "Retaliation")).toBe(true);
  });

  it("does not lose its printed keywords when the host is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-10", as: "mammothmon" }] } });
    await s.engine.recomputeContinuousEffects();
    await s.engine.suspendPermanent(s.perm("mammothmon").permanentId);
    await settle(() => s.perm("mammothmon").isSuspended);

    expect(observe(s.engine).hasKeyword(s.perm("mammothmon"), "Blocker")).toBe(true);
  });
});
