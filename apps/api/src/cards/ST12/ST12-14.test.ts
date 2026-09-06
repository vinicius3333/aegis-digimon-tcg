import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST12-14.js";

describe("ST12-14 Aus Generics", () => {
  it("grants +2000 DP, gains 1 memory and grants Piercing with Huckmon in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST12-04", as: "huckmon" }], hand: [{ card: "ST12-14", as: "option" }] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("huckmon").currentDP === s.perm("huckmon").baseDP + 2000 &&
        observe(s.engine).hasPierce(s.perm("huckmon")) &&
        s.state.memory === 3,
      5000,
    );
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasPierce(s.perm("huckmon"))).toBe(true);
  });

  it("can choose different Digimon for +2000 DP and Piercing (Q761)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST12-04", as: "huckmon" },
            { card: "ST12-10", as: "jesmon" },
          ],
          hand: [{ card: "ST12-14", as: "option" }],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpTarget = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dpTarget.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("huckmon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const piercingTarget = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: piercingTarget.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("jesmon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("huckmon").currentDP).toBe(s.perm("huckmon").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("huckmon"))).toBe(false);
    expect(s.perm("jesmon").currentDP).toBe(s.perm("jesmon").baseDP);
    expect(observe(s.engine).hasPierce(s.perm("jesmon"))).toBe(true);
  });

  it("only grants DP when no Huckmon or Royal Knight is in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST12-09", as: "volcanomon" }], hand: [{ card: "ST12-14", as: "option" }] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST12-14"));

    expect(s.perm("volcanomon").currentDP).toBe(s.perm("volcanomon").baseDP + 2000);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasPierce(s.perm("volcanomon"))).toBe(false);
  });

  it("expires the DP and Piercing bonuses at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-04", as: "huckmon" }],
          hand: [{ card: "ST12-14", as: "option" }],
          deck: ["ST1-02", "ST1-02"],
        },
        1: { deck: ["ST1-02", "ST1-02"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("huckmon").currentDP === s.perm("huckmon").baseDP + 2000);
    expect(s.perm("huckmon").currentDP).toBe(s.perm("huckmon").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("huckmon"))).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(s.perm("huckmon").currentDP).toBe(s.perm("huckmon").baseDP);
    expect(observe(s.engine).hasPierce(s.perm("huckmon"))).toBe(false);
  });

  it("gains 1 memory and returns itself to hand from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST12-14", as: "option", faceUp: true }] } },
      { autoOrderTriggers: true },
    );
    const id = s.inst("option").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === id)).toBe(true);
  });
});
