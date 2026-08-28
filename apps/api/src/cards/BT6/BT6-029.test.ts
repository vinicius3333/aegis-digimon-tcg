import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-029.js";

describe("BT6-029 Azulongmon", () => {
  it("trashes each bottom source and gains memory for every opponent Digimon left without sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT6-029", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT2-020", under: ["BT1-010"], as: "a" },
            { card: "BT2-017", as: "b" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.perm("a").stack).toHaveLength(0);
    expect(s.perm("b").stack).toHaveLength(0);
  });

  it("gains Security Attack +1 for each opponent Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-029", as: "azulongmon" }] },
      1: { battleArea: ["BT1-009", "BT1-014", { card: "BT2-020", under: ["BT1-001"] }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("azulongmon"), "SecurityAttack")).toBe(2);
  });
});
