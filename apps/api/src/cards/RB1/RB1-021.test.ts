import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-021 WezenGammamon", () => {
  it("has Blocker while in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-021", as: "wezen" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("wezen"), "Blocker")).toBe(true);
  });

  it("does not grant Blocker to a different Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-021", as: "wezen" },
          { card: "RB1-020", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });

  it("uses the alternate Gammamon evolution requirement for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-005", as: "base" }], hand: [{ card: "RB1-021", as: "wezen" }] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wezen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);

    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["RB1-005"]);
  });

  it("rejects BetelGammamon as a base for the exact Gammamon alternate requirement", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-008", as: "base" }], hand: [{ card: "RB1-021", as: "wezen" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wezen").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
