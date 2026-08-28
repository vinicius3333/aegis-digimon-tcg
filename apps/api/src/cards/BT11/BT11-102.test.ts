import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-102.js";

describe("BT11-102 High Mega Blaster", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-102")).toMatchObject({ cardId: "BT11-102", colors: ["Green"], kinds: ["Option"], playCost: 3 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Main", actions: [{ kind: "SelectBind" }, { kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "Suspend" }] },
    ]);
  });

  it("suspends exactly two opponent Digimon at or below the chosen Insect's DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-058", as: "insect" }], hand: [{ card: "BT11-102", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 3000 },
            { card: "BT1-011", as: "eligible", dp: 12000 },
            { card: "BT1-012", as: "tooLarge", dp: 13000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("low").isSuspended && s.perm("eligible").isSuspended);

    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });

  it("Security suspends two opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT11-102", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });
});
