import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-087.js";

describe("BT18-087 Owen Dreadnought", () => {
  it("covers memory setting, suspended cost, DP boundary, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn" });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Delete", cost: { kind: "suspend" } }] },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-087", as: "owen" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("owen"));

    expect(s.state.memory).toBe(3);
  });

  it("suspends itself to delete an opposing Digimon at 4000 DP or less after security removal", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-087", as: "owen" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(() => s.perm("low")).toThrow();
    expect(s.perm("high")).toBeDefined();
  });

  it("plays itself without cost from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-087", as: "owen", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("owen"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("owen").instanceId)).toBe(
      true,
    );
  });
});
