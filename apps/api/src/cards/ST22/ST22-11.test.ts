import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { observe } from "../../engine/testkit/observe.js";

describe("ST22-11 Defense Plug-In F", () => {
  it("de-digivolves two cards and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST22-11", as: "option" }, "BT1-090"] },
        1: { battleArea: [{ card: "BT1-020", as: "opponent", under: ["BT1-010", "BT1-015"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.inst("option").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === option));
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === option)).toBe(true);
  });
  it("keeps the temporary DP on the chosen Reboot recipient independently of the Link recipient", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST22-11", as: "option" }],
          battleArea: [
            { card: "ST5-06", as: "linked" },
            { card: "ST5-06", as: "boosted" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const linkDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: linkDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("linked").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== linkDecision.decisionId,
    );
    const rebootDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: rebootDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("boosted").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boosted").currentDP === 7000);
    expect(s.perm("linked").currentDP).toBe(6000);
    expect(s.perm("boosted").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("boosted"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("linked"), "Reboot")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
