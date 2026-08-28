import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-053.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-053 Mihiramon", () => {
  it("suspends a target and prevents unsuspension without undoing the suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("suspends an eligible opponent Digimon and keeps it suspended", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-053", as: "mihira" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihira").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 3000);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("may suspend a low-DP Digimon and separately lock a high-DP Digimon (Q2295-Q2297)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-053", as: "mihira" }] },
      1: { battleArea: [{ card: "BT13-053", as: "low" }, { card: "BT13-111", as: "high" }] },
    });
    await s.ready();
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mihira"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("high").permanentId] },
    })).toEqual({ ok: true });
    await resolving;
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("low"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("high"), "unsuspend")).toBe(true);
  });

  it("reduces only its inherited host's first digivolution each turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-051", as: "host", under: ["BT13-053"] },
          { card: "BT13-051", as: "other" },
        ],
        hand: [
          { card: "BT13-054", as: "lilamon" },
          { card: "BT13-057", as: "rosemon" },
          { card: "BT13-054", as: "other-lilamon" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("lilamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-054");
    expect(s.state.memory).toBe(8);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("rosemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-057");
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("other").permanentId,
      instanceId: s.inst("other-lilamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard.cardId === "BT13-054");
    expect(s.state.memory).toBe(2);
  });

  it("normally digivolves from a green level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "base" }], hand: [{ card: "BT13-053", as: "mihira" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("mihira").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-053");
    expect(s.state.memory).toBe(1);
  });
});
