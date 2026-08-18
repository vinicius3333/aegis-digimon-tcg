import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-015.js";
describe("BT9-015 MetalGreymon (X Antibody)", () => {
  it("gains Security Attack +1 and 3000 DP over MetalGreymon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "BT9-015", as: "evolving" }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack")).toBe(true);
  });

  it("gains Security Attack +1 but not DP over an unrelated red level 4", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base" }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
  });

  it("does not mistake an X Antibody trait for the [X Antibody] card name (Q1808)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base", under: ["BT7-056"] }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
  });

  it("does not mistake MetalGreymon (X Antibody) for the exact [MetalGreymon] or [X Antibody] card name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-017", as: "base", under: ["BT9-015"] }],
        hand: [{ card: "BT9-015", as: "evolving" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));

    expect(s.perm("base").currentDP).toBe(8000);
  });
});
