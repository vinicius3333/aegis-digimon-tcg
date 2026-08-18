import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-057.js";
describe("BT10-057 Bloomlordmon", () => {
  it("gains memory for suspended Vegetation/Plant/Fairy Digimon, then unsuspends and gains Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-043", as: "toSuspend" }, { card: "BT10-046", as: "alreadySuspended", suspended: true }, { card: "AD1-011", as: "base", suspended: true }], hand: [{ card: "BT10-057", as: "evolving" }] } }, { autoAcceptOptional: true, autoSelectCards: true }); s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() =>
      !s.perm("base").isSuspended &&
      observe(s.engine).hasPierce(s.perm("base")) &&
      [...s.perm("base").keywords].includes("Piercing"),
    );
    expect(s.state.memory).toBe(3);
    expect(s.perm("toSuspend").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
    expect([...s.perm("base").keywords]).toContain("Piercing");
  });

  it("does not publish conditional Piercing to the UI before gaining 2 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-057", as: "bloom" }] } });

    await s.engine.recomputeContinuousEffects();

    expect([...s.perm("bloom").keywords]).not.toContain("Piercing");
  });

  it("stays suspended and gains no Piercing when only BloomLordmon itself qualifies", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-011", as: "base", suspended: true }],
        hand: [{ card: "BT10-057", as: "evolving" }],
      },
    });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(false);
    expect([...s.perm("base").keywords]).not.toContain("Piercing");
  });

  it("scales +2000 DP and Security Attack for every 2 suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-057", as: "bloom", suspended: true },
          { card: "BT10-043", suspended: true },
          { card: "BT10-046", suspended: true },
          { card: "BT10-047", suspended: true },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("bloom").currentDP).toBe(16000);
    expect(observe(s.engine).keywordAmount(s.perm("bloom"), "SecurityAttack")).toBe(2);
    expect([...s.perm("bloom").keywords]).toContain("SecurityAttack");
  });
});
