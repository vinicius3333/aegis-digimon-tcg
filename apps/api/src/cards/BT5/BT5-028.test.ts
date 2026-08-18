import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-028.js";

describe("BT5-028 CrysPaledramon", () => {
  it("trashes the bottom source of every opposing Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: "BT5-028", as: "evolving" }] },
      1: { battleArea: [{ card: "BT2-020", under: ["BT1-010", "BT1-011"], as: "a" }, { card: "BT2-017", under: ["BT1-012"], as: "b" }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("a").stack.length === 1 && s.perm("b").stack.length === 0);

    expect(s.perm("a").stack[0]?.cardId).toBe("BT1-011");
  });

  it("grants Security Attack +1 to its host while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-028"] }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourceLess" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
