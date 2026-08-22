import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-12.js";

describe("ST1-12 Tai Kamiya", () => {
  it("registers the team DP aura and free security play as complete IR", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [], effects: [
      { trigger: "YourTurn", actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: 1000 }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
    ] });
  });

  it("multiple copies stack for all of your Digimon only during your turn (Q606)", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["ST1-12", "ST1-12", { card: "ST1-03", as: "agumon" }, { card: "ST1-06", as: "coredramon" }],
      },
      1: { battleArea: [{ card: "ST1-03", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("agumon").currentDP).toBe(s.perm("agumon").baseDP + 2000);
    expect(s.perm("coredramon").currentDP).toBe(s.perm("coredramon").baseDP + 2000);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("agumon").currentDP).toBe(s.perm("agumon").baseDP);
    expect(s.perm("coredramon").currentDP).toBe(s.perm("coredramon").baseDP);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST1-12", as: "securityTai", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTai"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST1-12")).toBe(true);
  });
});
