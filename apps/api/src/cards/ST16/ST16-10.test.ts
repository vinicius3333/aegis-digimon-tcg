import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST16-10.js";

describe("ST16-10 Mammothmon", () => {
  it("exposes Blocker and inherited Retaliation from its evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-11", as: "host", under: [{ card: "ST16-10" }] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("does not lose its printed keywords when the host is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-10", as: "mammothmon" }] } });
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.suspend([s.perm("mammothmon").permanentId]);
    await settle(() => s.perm("mammothmon").isSuspended);

    expect(observe(s.engine).hasKeyword(s.perm("mammothmon"), "Blocker")).toBe(true);
  });
});
