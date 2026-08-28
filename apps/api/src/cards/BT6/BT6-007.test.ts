import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-007.js";

describe("BT6-007 Agumon", () => {
  it("gains 1 memory when you play a Tai Kamiya Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-007", as: "agumon" }], hand: [{ card: "BT1-085", as: "tai" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("grants Security Attack +1 while inherited by Agumon - Bond of Bravery", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-018", under: ["BT6-007"], as: "bond" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("bond"), "SecurityAttack")).toBe(1);
  });
});
