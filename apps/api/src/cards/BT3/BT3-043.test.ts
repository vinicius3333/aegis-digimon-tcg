import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-043.js";
describe("BT3-043 Kentaurosmon", () => {
  it("gives Security Attack -2 to up to five opponents", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-015", as: "base" }], hand: [{ card: "BT3-043", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT2-020", as: "a" },
            { card: "BT2-017", as: "b" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("a"), "SecurityAttack") &&
        observe(s.engine).hasKeyword(s.perm("b"), "SecurityAttack"),
    );
    expect(observe(s.engine).keywordAmount(s.perm("a"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("b"), "SecurityAttack")).toBe(-2);
  });

  it("limits the effect to five opposing Digimon and excludes its controller", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-015", as: "base" },
            { card: "BT1-019", as: "own" },
          ],
          hand: [{ card: "BT3-043", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "a" },
            { card: "BT1-019", as: "b" },
            { card: "BT1-019", as: "c" },
            { card: "BT1-019", as: "d" },
            { card: "BT1-019", as: "e" },
            { card: "BT1-019", as: "f" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    const opponents = ["a", "b", "c", "d", "e", "f"];
    await settle(
      () => opponents.filter((alias) => observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -2).length === 5,
    );

    expect(opponents.filter((alias) => observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -2)).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("own"), "SecurityAttack")).toBe(false);
  });

  it("gives an opposing Digimon -11000 DP on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-043", as: "source" }] },
        1: { battleArea: [{ card: "BT3-019", as: "target", dp: 13000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
