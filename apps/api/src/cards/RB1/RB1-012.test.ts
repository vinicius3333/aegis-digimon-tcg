import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-012 KausGammamon", () => {
  it("has Evade while in the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-011", as: "base" }], hand: [{ card: "RB1-012", as: "kaus" }] },
    });
    const baseTopId = s.perm("base").topCard.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kaus").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("kaus"), "Evade")).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.filter((card) => card.instanceId === baseTopId)).toHaveLength(1);
  });

  it("does not grant Evade to a different Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-012", as: "kaus" },
          { card: "RB1-011", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("other"), "Evade")).toBe(false);
  });

  it("rejects the alternate Gammamon evolution from a BetelGammamon-named base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-008", as: "base" }], hand: [{ card: "RB1-012", as: "kaus" }] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kaus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
