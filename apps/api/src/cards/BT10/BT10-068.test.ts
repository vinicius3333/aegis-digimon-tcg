import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-068.js";
describe("BT10-068 Gankoomon (X Antibody)", () => {
  it("plays Sistermon, gives all own Digimon +2000 DP, and protects them from bounce and DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", as: "base" }],
          hand: [
            { card: "BT10-068", as: "evolving" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "dpImmune"));
    expect(s.perm("base").currentDP).toBe(14000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("base"), "beReturned")).toBe(true);
  });

  it("does not treat Gankoomon (X Antibody) as the exact Gankoomon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-068", as: "gankooX", under: ["BT10-068"] }] } });
    const printedDP = s.perm("gankooX").baseDP;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gankooX"));

    expect(s.perm("gankooX").currentDP).toBe(printedDP);
    expect(observe(s.engine).isRestricted(s.perm("gankooX"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("gankooX"), "beReturned")).toBe(false);
  });

  it("restores a previously reduced Digimon before applying the +2000 DP bonus (Q1990)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", as: "base" }],
          hand: [
            { card: "BT10-068", as: "evolving" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).verb.modifyDP(s.perm("base").permanentId, -3000, EffectDuration.Permanent);
    expect(s.perm("base").currentDP).toBe(9000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "dpImmune"));

    expect(s.perm("base").currentDP).toBe(14000);
  });
});
