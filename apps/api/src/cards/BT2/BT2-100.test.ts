import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-100.js";

describe("BT2-100 Puppet Pummel", () => {
  it("suspends an opposing Digimon and boosts yours", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-042", as: "mine" }], hand: [{ card: "BT2-100", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && s.perm("mine").currentDP === 5000);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("mine").currentDP).toBe(5000);
  });

  it("still gives +2000 DP when there is no opposing Digimon to suspend", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-042", as: "mine" }], hand: [{ card: "BT2-100", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mine").currentDP === 5000);

    expect(s.perm("mine").currentDP).toBe(5000);
  });

  it("still suspends an opposing Digimon when there is no own Digimon to boost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-088"], hand: [{ card: "BT2-100", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("chooses exactly one opposing Digimon and one own Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-042", as: "ownFirst" },
          { card: "BT2-043", as: "ownSecond" },
        ],
        hand: [{ card: "BT2-100", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT2-045", as: "oppFirst" },
          { card: "BT2-046", as: "oppSecond" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("oppSecond").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== suspendDecision.decisionId,
    );
    const boostDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: boostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownSecond").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownSecond").currentDP === s.perm("ownSecond").baseDP + 2000);

    expect(s.perm("oppFirst").isSuspended).toBe(false);
    expect(s.perm("oppSecond").isSuspended).toBe(true);
    expect(s.perm("ownFirst").currentDP).toBe(s.perm("ownFirst").baseDP);
    expect(s.perm("ownSecond").currentDP).toBe(s.perm("ownSecond").baseDP + 2000);
  });
});
