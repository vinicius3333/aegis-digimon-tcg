import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-082.js";
import "./BT1-103.js";

describe("BT1 Rosemon historical deck gauntlet", () => {
  it("offers every distinct opposing Digimon, including a printed Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }],
        security: ["BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-016", as: "attacker" },
          { card: "BT1-017", as: "firstCopy" },
          { card: "BT1-017", as: "secondCopy" },
          { card: "BT1-072", as: "printedBlocker" },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("chooseTargets");
    const request = s.decisions.find(({ req }) => req.decisionId === pending?.decisionId)?.req;
    const candidateIds = request?.options?.candidateInstanceIds ?? [];
    expect(candidateIds).toEqual(
      expect.arrayContaining([
        s.perm("attacker").permanentId,
        s.perm("firstCopy").permanentId,
        s.perm("secondCopy").permanentId,
      ]),
    );
    expect(new Set(candidateIds).size).toBe(4);
    expect(candidateIds).toContain(s.perm("printedBlocker").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("secondCopy").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondCopy").isSuspended);
    expect(s.perm("firstCopy").isSuspended).toBe(false);
    expect(s.perm("secondCopy").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not apply Flower Cannon's Blocker restriction to Rosemon's candidates", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-060", as: "grantedBlocker" },
            { card: "BT1-017", as: "legalTarget" },
          ],
          hand: [{ card: "BT1-103", as: "testament" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("grantedBlocker").permanentId);
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("testament").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("grantedBlocker"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("grantedBlocker"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseTargets").length >= 2);

    const rosemonRequest = s.decisions.filter(({ req }) => req.kind === "chooseTargets").at(-1)?.req;
    const candidateIds = rosemonRequest?.options?.candidateInstanceIds ?? [];
    expect(candidateIds).toContain(s.perm("legalTarget").permanentId);
    expect(candidateIds).toContain(s.perm("grantedBlocker").permanentId);
    assertNoLoudGap(s);
  });
});
