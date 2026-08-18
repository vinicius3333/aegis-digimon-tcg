import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-054.js";
import "./BT3-056.js";

describe("BT3 Ceresmon/Blossomon Digisorption deck gauntlet", () => {
  it("redirects the first suspend to the opponent, spends the redirect, and never invents Piercing", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-056", as: "redirector" },
            { card: "BT1-016", as: "tyrannomon" },
            { card: "BT2-044", as: "greenLevelFour" },
          ],
          hand: [
            { card: "BT3-054", as: "blossomon" },
            { card: "BT3-056", as: "secondCeresmon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "redirectTarget" },
            { card: "BT1-010", as: "mustRemainUnsuspended" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    const redirectTargetInstanceId = s.perm("redirectTarget").topCard!.instanceId;
    const otherOpponentInstanceId = s.perm("mustRemainUnsuspended").topCard!.instanceId;
    preferredIds.push(redirectTargetInstanceId);
    const hostId = s.perm("greenLevelFour").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("redirector"), "Piercing")).toBe(false);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("blossomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("redirectTarget").isSuspended &&
      s.perm("greenLevelFour").topCard?.instanceId === s.inst("blossomon").instanceId &&
      s.state.pendingDecision === undefined
    );

    const redirectedChoice = s.decisions.find(({ req }) =>
      (req.kind === "chooseTargets" || req.kind === "selectCards") &&
      req.options?.candidateInstanceIds?.includes(redirectTargetInstanceId)
    )?.req;
    expect(redirectedChoice?.options?.candidateInstanceIds).toContain(otherOpponentInstanceId);
    expect(s.state.memory).toBe(5);
    expect(s.perm("redirectTarget").isSuspended).toBe(true);
    expect(s.perm("mustRemainUnsuspended").isSuspended).toBe(false);

    preferredIds.splice(0, preferredIds.length, s.perm("tyrannomon").topCard!.instanceId);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: hostId,
      instanceId: s.inst("secondCeresmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("tyrannomon").isSuspended &&
      s.perm("greenLevelFour").topCard?.instanceId === s.inst("secondCeresmon").instanceId &&
      s.state.memory === 3 &&
      s.state.pendingDecision === undefined
    );

    const secondSuspendChoice = [...s.decisions].reverse().find(({ req }) =>
      (req.kind === "chooseTargets" || req.kind === "selectCards") &&
      req.options?.candidateInstanceIds?.includes(s.perm("tyrannomon").topCard!.instanceId)
    )?.req;
    expect(secondSuspendChoice?.options?.candidateInstanceIds).not.toContain(otherOpponentInstanceId);
    expect(s.perm("mustRemainUnsuspended").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).hasKeyword(s.perm("redirector"), "Piercing")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("greenLevelFour"), "Piercing")).toBe(false);
    assertNoLoudGap(s);
  });
});
