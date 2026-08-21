import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-094.js";

describe("BT4-094 Tai Kamiya", () => {
  it("gives all own Digimon +1000 DP while at 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-094", as: "tai" },
          { card: "BT1-009", as: "red" },
          { card: "BT4-076", as: "purple" },
        ],
        security: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("red").currentDP).toBe(s.perm("red").baseDP + 1000);
    expect(s.perm("purple").currentDP).toBe(s.perm("purple").baseDP + 1000);
  });

  it("suspends to gain memory when an opposing Digimon is deleted at 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-094", as: "tai" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byRule");
    expect(s.perm("tai").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("does not suspend for an opposing Digimon deleted by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-094", as: "tai" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;

    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");

    expect(s.perm("tai").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("plays itself from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT4-094", as: "securityTamer", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
