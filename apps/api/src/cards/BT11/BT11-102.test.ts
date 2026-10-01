import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-102.js";

describe("BT11-102 High Mega Blaster", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-102")).toMatchObject({
      cardId: "BT11-102",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [{ kind: "SelectBind" }, { kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }],
      },
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

describe("BT11-102 High Mega Blaster — KB Q&A rulings", () => {
  it("must suspend 2 opponent Digimon when 2 or more are eligible, not 1 or none (Q2131)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-058", as: "insect" }], hand: [{ card: "BT11-102", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
          { card: "BT1-012", as: "third" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.options?.targetFate === "suspend"));
    const suspendRequest = s.decisions.find(({ req }) => req.options?.targetFate === "suspend")!.req;
    expect(suspendRequest.options).toMatchObject({ min: 2, max: 2 });

    const respondWith = (instanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendRequest.decisionId,
        response: { kind: "chooseTargets", instanceIds },
      });
    const first = s.perm("first").permanentId;
    const second = s.perm("second").permanentId;

    expect(respondWith([])).toMatchObject({ ok: false });
    expect(respondWith([first])).toMatchObject({ ok: false });
    expect(s.perm("first").isSuspended).toBe(false);

    expect(respondWith([first, second])).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("third").isSuspended).toBe(false);
  });
});
