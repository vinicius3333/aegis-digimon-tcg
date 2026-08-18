import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-040.js";
describe("BT10-040 Achillesmon", () => {
  it("recovers 1 when digivolving with 2 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-015", as: "base" }],
        hand: [{ card: "BT10-040", as: "evolving" }],
        deck: ["BT1-001"],
        security: 2,
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("at exactly 3 security applies both -5000 DP and gain 2 memory (Q1959)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-040", as: "achillesmon" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "chosenTarget", dp: 10_000 },
            { card: "BT1-020", as: "otherTarget", dp: 10_000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("achillesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const choice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "BT10-040",
      options: {
        candidateInstanceIds: [s.perm("chosenTarget").permanentId, s.perm("otherTarget").permanentId],
        min: 1,
        max: 1,
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("chosenTarget").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.memory === 2 && s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("chosenTarget").currentDP).toBe(5000);
    expect(s.perm("otherTarget").currentDP).toBe(10_000);
    assertNoLoudGap(s);
  });

  it("separates the two security boundaries on either side of 3", async () => {
    const low = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-040", as: "achillesmon" }], security: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 10_000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await low.ready();
    expect(
      low.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: low.perm("achillesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => low.state.memory === 2 && !observe(low.engine).isAttacking());
    expect(low.state.players[0]!.security).toHaveLength(2);
    expect(low.state.players[1]!.security).toHaveLength(0);
    expect(low.perm("target").currentDP).toBe(10_000);

    const high = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-040", as: "achillesmon" }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 10_000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await high.ready();
    expect(
      high.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: high.perm("achillesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => high.perm("target").currentDP === 5000 && !observe(high.engine).isAttacking());
    expect(high.state.memory).toBe(0);
    expect(high.state.players[0]!.security).toHaveLength(4);
    expect(high.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(low);
    assertNoLoudGap(high);
  });
});
