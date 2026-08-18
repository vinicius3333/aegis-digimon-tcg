import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-075.js";
import "../ST1/ST1-16.js";
import "../ST5/ST5-11.js";

describe("BT3 Craniamon ST5 Blocker fortress deck gauntlet", () => {
  it("protects an inherited Blocker from effect deletion but not from losing a blocked battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-075", as: "craniamon" },
          { card: "ST5-12", as: "inheritedBlocker", under: ["ST5-11"] },
          { card: "ST5-08", as: "printedBlocker" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-084", as: "attacker", dp: 20000 },
          { card: "ST1-03", as: "redSource" },
        ],
        hand: [{ card: "ST1-16", as: "gaiaForce" }],
        security: ["BT1-009"],
      },
    });
    const craniamonId = s.perm("craniamon").permanentId;
    const inheritedBlockerId = s.perm("inheritedBlocker").permanentId;
    const printedBlockerId = s.perm("printedBlocker").permanentId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("inheritedBlocker"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, {
      type: "playCard",
      instanceId: s.inst("gaiaForce").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const deletionDecision = s.state.pendingDecision;
    expect(deletionDecision?.kind).toBe("chooseTargets");
    const deletionRequest = s.decisions.find(
      ({ req }) => req.decisionId === deletionDecision?.decisionId,
    )?.req;
    expect(deletionRequest?.sourceCardId).toBe("ST1-16");
    expect(new Set(deletionRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([craniamonId, inheritedBlockerId, printedBlockerId]),
    );
    expect(s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: deletionDecision!.decisionId,
      response: { kind: "chooseTargets", instanceIds: [inheritedBlockerId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.state.players[1]!.trash.some(({ cardId }) => cardId === "ST1-16"),
    );

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([craniamonId, inheritedBlockerId, printedBlockerId]),
    );

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, {
      type: "declareBlock",
      blockerPermanentId: inheritedBlockerId,
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === inheritedBlockerId),
      5000,
    );

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["ST5-11", "ST5-12"]),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === craniamonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === printedBlockerId)).toBe(true);
    assertNoLoudGap(s);
  });
});
