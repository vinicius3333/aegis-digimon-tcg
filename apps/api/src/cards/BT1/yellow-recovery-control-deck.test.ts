import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-048.js";
import "./BT1-060.js";
import "./BT1-063.js";
import "./BT1-087.js";
import "./BT1-107.js";

describe("BT1 yellow recovery control deck gauntlet", () => {
  it("chains Patamon and T.K. searches into Seraphimon and exactly one Holy Wave recovery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "magnaAngemon" }],
          hand: [
            { card: "BT1-048", as: "patamon" },
            { card: "BT1-063", as: "seraphimon" },
          ],
          security: [
            { card: "BT1-107", as: "securityHolyWave" },
            { card: "BT1-009", as: "redSecurity" },
            { card: "BT1-049", as: "yellowSecurity" },
          ],
          deck: [
            { card: "BT1-087", as: "searchedTk" },
            { card: "BT1-087", as: "secondSearchedTk" },
            "BT1-010",
            "BT1-011",
            "BT1-001",
            "BT1-002",
            "BT1-003",
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoOrderCards: true, autoOrderTriggers: true },
    );
    const holyWaveId = s.inst("securityHolyWave").instanceId;
    const redSecurityId = s.inst("redSecurity").instanceId;
    const yellowSecurityId = s.inst("yellowSecurity").instanceId;
    const tkId = s.inst("secondSearchedTk").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("patamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === tkId) && s.state.pendingDecision === undefined,
    );
    // Let the automatic Patamon ordering response finish its effect continuation
    // before starting the next play intent.
    await settle(() => false, 5);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === tkId)).toBe(true);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: tkId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const securityChoice = s.decisions.at(-1)!.req;
    expect(securityChoice.sourceCardId).toBe("BT1-087");
    expect(new Set(securityChoice.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([holyWaveId, redSecurityId, yellowSecurityId]),
    );
    expect(new Set(securityChoice.options?.visibleInstanceIds ?? [])).toEqual(
      new Set([holyWaveId, redSecurityId, yellowSecurityId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: securityChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [holyWaveId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === holyWaveId) &&
        s.state.players[0]!.security.length === 3,
    );
    await settle(() => false, 5);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(3);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("magnaAngemon").permanentId,
        instanceId: s.inst("seraphimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("magnaAngemon").topCard.instanceId === s.inst("seraphimon").instanceId &&
        s.state.players[0]!.security.length === 4,
    );

    expect(s.perm("magnaAngemon").currentDP).toBe(11000);
    expect(observe(s.engine).keywordAmount(s.perm("magnaAngemon"), "SecurityAttack")).toBe(1);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnaAngemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 5000);

    const securityBeforeHolyWave = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: holyWaveId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === securityBeforeHolyWave + 1 &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === holyWaveId),
    );

    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.decisions.some(
        ({ req }) => req.sourceCardId === "BT1-107" && (req.kind === "selectCards" || req.kind === "chooseTargets"),
      ),
    ).toBe(false);
    assertNoLoudGap(s);
  });
});
