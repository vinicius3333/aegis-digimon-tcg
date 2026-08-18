import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST5-08.js";
import "./ST5-09.js";
import "./ST5-12.js";

describe("ST5 Machinedramon Reboot/Blocker deck", () => {
  it("binds identical guards by permanent, grants two Reboots, and leaves the blocker suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST5-08", as: "machineBase" },
          { card: "ST5-05", as: "firstGuard" },
          { card: "ST5-05", as: "secondGuard" },
        ],
        hand: [
          { card: "ST5-09", as: "metalGreymon" },
          { card: "ST5-12", as: "machinedramon" },
        ],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 1000, as: "attacker" }] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("machineBase").permanentId,
      instanceId: s.inst("metalGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.sourceCardId === "ST5-09" && req.kind === "chooseTargets";
    });

    const blockerDecision = s.decisions.at(-1)!.req;
    expect(blockerDecision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("machineBase").permanentId,
      s.perm("firstGuard").permanentId,
      s.perm("secondGuard").permanentId,
    ]));
    expect(blockerDecision.options?.candidateInstanceIds).not.toContain(
      s.perm("firstGuard").topCard.instanceId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: blockerDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("firstGuard").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("firstGuard"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("secondGuard"), "Blocker")).toBe(false);

    const decisionCount = s.decisions.length;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("machineBase").permanentId,
      instanceId: s.inst("machinedramon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.decisions.length > decisionCount &&
      s.decisions.at(-1)?.req.sourceCardId === "ST5-12" &&
      s.decisions.at(-1)?.req.kind === "chooseTargets",
    );

    const rebootDecision = s.decisions.at(-1)!.req;
    expect(rebootDecision.options?.min).toBe(0);
    expect(rebootDecision.options?.max).toBe(2);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: rebootDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [
          s.perm("firstGuard").permanentId,
          s.perm("secondGuard").permanentId,
        ],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      observe(s.engine).hasKeyword(s.perm("firstGuard"), "Reboot") &&
      observe(s.engine).hasKeyword(s.perm("secondGuard"), "Reboot"),
    );

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const blockWindow = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(blockWindow).toMatchObject({
      eligibleBlockerIds: [s.perm("firstGuard").permanentId],
    });
    expect(s.engine.applyIntent(0, {
      type: "declareBlock",
      blockerPermanentId: s.perm("firstGuard").permanentId,
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("firstGuard").isSuspended).toBe(true);
    expect(s.perm("secondGuard").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
