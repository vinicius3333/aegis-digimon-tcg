import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-041.js";

describe("EX1-041 Dinobeemon", () => {
  it("suspends a 5000 DP-or-less opponent when digivolving over Free", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-038", as: "base" }], hand: [{ card: "EX1-041", as: "evo" }] }, 1: { battleArea: [{ card: "BT1-070", as: "target", dp: 5000 }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("gains 1 memory when an Imperialdramon deletes in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-041"] }] } });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(6);
  });

  it("observes another allied Imperialdramon but ignores non-Imperialdramon and opposing winners", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", as: "carrier", under: ["EX1-041"] },
          { card: "EX1-022", as: "alliedImperialdramon" },
          { card: "BT1-081", as: "alliedNonImperialdramon" },
        ],
      },
      1: { battleArea: [{ card: "EX1-022", as: "opposingImperialdramon" }] },
    });
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("alliedNonImperialdramon").permanentId,
    });
    expect(s.state.memory).toBe(5);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("opposingImperialdramon").permanentId,
    });
    expect(s.state.memory).toBe(5);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("alliedImperialdramon").permanentId,
    });
    expect(s.state.memory).toBe(6);
  });
});
