import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-068.js";

describe("BT1-068 Kokuwamon", () => {
  it("gives Security Attack +1 while its Digimon is level 6 or higher during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "host", under: ["BT1-068"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("still grants exactly Security Attack +1 at level 7", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT1-068"] }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 below level 6", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", under: ["BT1-068"] }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
  });

  it("does not grant Security Attack +1 during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "host", under: ["BT1-068"] }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
  });

  it("does not grant Security Attack while Kokuwamon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-068", as: "kokuwamon" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("kokuwamon"), "SecurityAttack")).toBe(0);
  });
});
