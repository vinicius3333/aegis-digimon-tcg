import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-017.js";
import "../BT3/BT3-075.js";
import "../ST5/ST5-08.js";

describe("BT9 Gallantmon X versus Craniamon control gauntlet", () => {
  it("lets the UI choose an effect-protected lowest-DP target, then restands after deletion fails", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-011", as: "gallantmon", suspended: true }],
        hand: [{ card: "BT9-017", as: "gallantmonX" }],
      },
      1: {
        battleArea: [
          { card: "BT3-075", as: "craniamon" },
          { card: "ST5-08", as: "protectedLowest", dp: 4000 },
          { card: "BT1-010", as: "unprotectedLowest", dp: 4000 },
        ],
        security: ["BT1-009", "BT1-011"],
        deck: ["BT1-001"],
      },
    });
    const protectedId = s.perm("protectedLowest").permanentId;
    const unprotectedId = s.perm("unprotectedLowest").permanentId;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("gallantmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const deletionDecision = s.state.pendingDecision;
    expect(deletionDecision?.kind).toBe("chooseTargets");
    const deletionRequest = s.decisions.find(({ req }) => req.decisionId === deletionDecision?.decisionId)?.req;
    expect(deletionRequest?.sourceCardId).toBe("BT9-017");
    expect(new Set(deletionRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([protectedId, unprotectedId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletionDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [protectedId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !s.perm("gallantmon").isSuspended &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-017"),
    );

    // Q1814: a tied lowest-DP Digimon that can't be deleted remains a legal choice. The failed
    // deletion restands Gallantmon X and does not trigger its deletion-based security trash.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([protectedId, unprotectedId]),
    );
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking(), 5000);

    expect(s.perm("gallantmon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
